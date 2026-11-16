import {
  OPENING_TITLES, ORGANIZATIONS, ROSTER, ROSTER_BY_ID, TITLES_BY_ID, nextShowForCareer, rosterFor,
  fitsEventRoster, showPromotions, showsThrough, upcomingShows, wrestlerAppearsIn, type Fighter, type RosterEntry,
} from '../content/catalog'
import { beltArtworkFor, titleName, titlePrestige, unifiedTitleName } from '../content/belt-designs'
import { MOVE_BY_ID, defaultMoves, swapMove, validMoveset } from '../content/moves'
import { appearanceSchema, defaultAppearance, type Appearance } from '../domain/appearance'
import { defenseFormat, type TitleRecord } from '../content/titles'
import { roundName, tournamentEdition } from '../content/tournaments'
import {
  ATTRIBUTES, ATTRIBUTE_CAP, ATTRIBUTE_NAMES, DATA_VERSION, DIFFICULTY_LABEL, INITIAL_BUDGET, INITIAL_LIMIT,
  DIVISIONS, MATCH_FORMAT_LABEL, METHOD_LABEL, MULTI_SIZE, OPENING_OFFER_COUNT, PROMOTIONS, SAVE_VERSION, START_DATE, STARTING_AGE_MESSAGE, TEAM_FORMATS, TEAM_SIZE,
  addDays, clamp, dayDistance, isMultiFormat, isTeamFormat, newCareerId, overall, pointsSpent, profileSchema, ringWeightSchema,
  suggestedAttributes, validStartingAge, type Attribute, type Bout, type Career, type Difficulty, type HistoryItem, type MatchFormat, type MatchResult,
  type Offer, type Profile, type PromotionId, type Show, type ShowReport, type TeamFormat, type TitleChange, type TitleDecision, type TitlePair, type WrestlingTeam,
} from '../domain/model'
import { createBout, playTurn, simulateSingles } from './combat'
import { matchFormat, matchTeams, matchWinners, multiFormatForSize, sameTeam } from './matches'
import { createMultiBout, playMultiTurn, simulateMulti } from './multi-combat'
import { Random } from './random'
import { CONTENDER_LIMIT, rankingsFor } from './rankings'
import { matchRivalry, rematchReady, rivalryStates, trackRivalry, type RivalryStates } from './rivalries'
import { cornerFighterIds, createTagBout, isTagBout, legalFighterId, playTagTurn, simulateTag } from './tag-combat'
import { availableTeamPartners, careerTeamPartners, hasMixedTeams, pickRosterTeam, playerTeamBooking, rosterTeam } from './tag-teams'
import {
  applyTitleChange, applyTitleMatch, beltsDue, canRedesign, canUnify, CAREER_FIGHTER_ID, compatibleTitles, showSupportsTitle,
  titleEligible, titleStates, type BeltStates,
} from './titles'
import { planTournaments, type TournamentFixture } from './tournaments'
import { UNIFICATION_REVIEW_DAYS, immediateUnification, titleProposalIssue, titleReviewIssue, unificationStats } from './title-office'

export const PLAYER_ID = CAREER_FIGHTER_ID
export { showEvidence } from '../content/calendar'
const namesList = new Intl.ListFormat('pt-BR')

export function exampleProfile(): Profile {
  return {
    name: 'BH', nickname: '', country: 'Brasil', city: '', age: 23, ringWeightKg: 80, division: 'men',
    alignment: 'Face', style: 'Highflyer', personality: 'Competitivo', appearance: '', gear: '', entrance: '',
    attributes: suggestedAttributes('Highflyer'), moves: defaultMoves('Highflyer'), moveLevels: {},
  }
}

export function playerFor(career: Career): Fighter {
  return { ...career.profile, id: PLAYER_ID }
}

export function fighterName(career: Career, id: string): string {
  return id === PLAYER_ID ? career.profile.name : ROSTER_BY_ID.get(id)?.name ?? id
}

export function fighterNames(career: Career, fighters: readonly string[]) {
  return namesList.format(fighters.map(id => fighterName(career, id)))
}

export function recordFor(career: Career, fighterId: string, individualOnly = false) {
  let wins = 0
  let losses = 0
  for (const show of career.shows) {
    for (const match of show.matches) {
      if (individualOnly && match.tag) continue
      const team = matchTeams(match).find(side => side.includes(fighterId))
      if (team?.includes(match.winnerId)) wins++
      else if (team) losses++
    }
  }
  return { wins, losses, total: wins + losses }
}

export const balanceFor = (career: Career) => career.ledger.reduce((sum, item) => sum + item.amount, 0)
export const hasLiveBout = (career: Career) => career.bout?.finish === null

function addHistory(career: Career, kind: HistoryItem['kind'], title: string, detail: string, promotion: PromotionId | null = null, player = false) {
  career.history = [...career.history, {
    id: 'event-' + career.history.length, date: career.date, kind, title, detail, promotion, ...(player ? { participantId: PLAYER_ID } : {}),
  }]
}

export function canJoin(career: Career, promotion: PromotionId): boolean {
  return rosterFor(promotion, false).some(fighter => fighter.division === career.profile.division)
}

function offersFor(career: Career, random: Random): Offer[] {
  const ovr = overall(career.profile.attributes, career.profile.style)
  const premium = career.difficulty === 'easy' ? 1.06 : career.difficulty === 'hard' ? 0.91 : 1
  const candidates = PROMOTIONS.filter(promotion => canJoin(career, promotion))
  const result: Offer[] = []
  for (let slot = 0; slot < OPENING_OFFER_COUNT; slot++) {
    const remaining = candidates.filter(promotion => result.every(offer => ORGANIZATIONS[offer.promotion].company !== ORGANIZATIONS[promotion].company))
    const renewing = career.contract?.status === 'expired' && slot === 0 ? career.contract.promotion : undefined
    const renewal = renewing && remaining.includes(renewing) ? renewing : undefined
    const offered = random.weighted(remaining, id => {
      const org = ORGANIZATIONS[id]
      const appeal = ovr + career.popularity * 0.48
      const gap = org.prestige - appeal
      return gap > 0 ? Math.max(0.04, 1 - gap / 24) : 1 + (appeal - org.prestige) / 55
    })
    const promotion = renewal ?? offered
    const org = ORGANIZATIONS[promotion]
    const marketPay = Math.round(org.basePay * premium * (0.83 + (ovr - 55) * 0.008 + career.popularity * 0.004 + random.next() * 0.17) / 5) * 5
    const pay = renewal ? Math.max(marketPay, career.contract!.pay) : marketPay
    const weeks = random.pick(org.prestige >= 61 ? [16, 20, 24] : [12, 16, 20])
    result.push({
      id: 'offer-' + career.history.length + '-' + promotion, promotion, weeks, pay,
      winBonus: Math.round(pay * 0.25), status: 'available', response: 'pending',
    })
  }
  return result
}
type CareerIdentity = { id?: string; seed?: number; createdAt?: number }

export function newCareer(input: Profile, difficulty: Difficulty, identity: CareerIdentity = {}): Career {
  if (!validStartingAge(input.age)) throw new Error(STARTING_AGE_MESSAGE)
  const profile = profileSchema.parse({ ...input, look: input.look ?? defaultAppearance() })
  if (profile.place && profile.place.city !== profile.city) throw new Error('A cidade deve corresponder à origem escolhida.')
  if (pointsSpent(profile.attributes) !== INITIAL_BUDGET || ATTRIBUTES.some(key => profile.attributes[key] > INITIAL_LIMIT)) {
    throw new Error('Distribua os 180 pontos respeitando o limite inicial de 90.')
  }
  if (!validMoveset(profile.moves) || profile.moves.some(id => MOVE_BY_ID.get(id)?.unlock)
    || profile.unlockedMoves?.length || Object.keys(profile.moveLevels).length) throw new Error('Revise os 20 espaços do moveset.')
  const random = new Random(identity.seed ?? crypto.getRandomValues(new Uint32Array(1))[0])
  const career: Career = {
    schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, id: identity.id ?? newCareerId(), revision: 0,
    createdAt: identity.createdAt ?? Date.now(), mode: 'free', profile, difficulty, rng: random.state,
    date: START_DATE, calendar: 'verified', worldThrough: addDays(START_DATE, -1), offers: [], contract: null, xp: 0, popularity: 6,
    bout: null, shows: [], expandedOn: null, vacatedTitles: [], titleChanges: [], titleProposal: null, titleDecision: null, tagPartnerId: null, trioPartnerIds: null,
    mixedPartnerId: null, preferredFormat: 'singles', tournamentEntries: [], tournamentFields: [], history: [], ledger: [],
  }
  career.offers = offersFor(career, random)
  career.rng = random.state
  addHistory(career, 'career', 'Início de carreira', profile.name + ' entrou no mercado com três propostas.')
  return career
}

export function updateAppearance(career: Career, look: Appearance): Career {
  return { ...career, profile: { ...career.profile, look: appearanceSchema.parse(look) } }
}

function currentOffer(career: Career, offerId: string): Offer {
  if (career.contract?.status === 'active') throw new Error('A carreira já tem um contrato ativo.')
  const offer = career.offers.find(item => item.id === offerId && item.status === 'available')
  if (!offer) throw new Error('Esta proposta já foi encerrada.')
  return offer
}

export function negotiate(career: Career, offerId: string, desiredPay: number): Career {
  const offer = currentOffer(career, offerId)
  if (offer.response !== 'pending') throw new Error('A empresa já respondeu a esta negociação.')
  if (!Number.isSafeInteger(desiredPay) || desiredPay <= offer.pay || desiredPay > offer.pay * 1.4) {
    throw new Error('Peça um aumento entre o valor da proposta e 40%.')
  }
  const random = new Random(career.rng)
  const pressure = career.difficulty === 'hard' ? -0.13 : career.difficulty === 'easy' ? 0.15 : 0
  const raise = desiredPay / offer.pay - 1
  const chance = clamp(0.67 + (career.profile.attributes.charisma - 60) * 0.007 + career.popularity * 0.002 + pressure - (raise - 0.1) * 2.1, 0.08, 0.94)
  const response = random.next() < chance ? 'accepted' : 'rejected'
  const pay = response === 'accepted' ? desiredPay : offer.pay
  const next: Career = {
    ...career, rng: random.state,
    offers: career.offers.map(item => item.id === offer.id ? { ...offer, pay, winBonus: Math.round(pay * 0.25), response } : item),
  }
  addHistory(next, 'contract', ORGANIZATIONS[offer.promotion].name + ' respondeu à contraproposta',
    response === 'accepted' ? 'Pagamento por show ajustado para $' + pay + '.' : 'A proposta inicial continua disponível.', offer.promotion)
  return next
}

export function declineOffer(career: Career, offerId: string): Career {
  const offer = currentOffer(career, offerId)
  const next: Career = { ...career, offers: career.offers.map(item => item.id === offer.id ? { ...item, status: 'declined' } : item) }
  addHistory(next, 'contract', 'Proposta recusada', 'Você recusou a proposta de ' + ORGANIZATIONS[offer.promotion].name + '.', offer.promotion)
  return next
}

function vacatePlayerTitles(career: Career, release: (title: TitleRecord) => boolean, reason: string) {
  for (const [titleId, state] of titleStates(career)) {
    const title = TITLES_BY_ID.get(titleId)!
    if (state.holders?.includes(PLAYER_ID) && release(title)) {
      career.vacatedTitles = [...career.vacatedTitles, { titleId, date: career.date }]
      addHistory(career, 'title', titleName(career, title) + ' ficou vago', reason, title.promotion)
    }
  }
}

export function setMatchPreference(career: Career, format: MatchFormat): Career {
  if (isTeamFormat(format) && careerTeamPartners(career, format).length === 0) {
    throw new Error('Forme a equipe antes de priorizar este formato.')
  }
  return { ...career, preferredFormat: format }
}

export function setFightTarget(career: Career, id: string): Career {
  const { bout } = career
  if (!bout?.multi || bout.finish || bout.multi.pendingFall || !bout.multi.opponents.some(entry => entry.id === id)) {
    throw new Error('Escolha um adversário disponível durante o combate.')
  }
  if (bout.multi.targetId === id) return career
  return { ...career, bout: { ...bout, multi: { ...bout.multi, targetId: id } } }
}

export function registerRingWeight(career: Career, weight: number): Career {
  if (career.profile.ringWeightKg !== null) throw new Error('O peso de ringue já foi registrado nesta carreira.')
  const parsed = ringWeightSchema.safeParse(weight)
  if (!parsed.success) throw new Error('Informe um peso de ringue válido em quilos.')
  return { ...career, profile: { ...career.profile, ringWeightKg: parsed.data } }
}

export function setCareerTeam(career: Career, format: TeamFormat, partners: readonly string[] | null): Career {
  if (hasLiveBout(career)) throw new Error('Finalize a luta em andamento antes de alterar sua equipe.')
  const promotion = career.contract?.promotion
  const label = { tag: 'dupla', trios: 'trio', mixed: 'dupla mista' }[format]
  const current = careerTeamPartners(career, format)
  const size = TEAM_SIZE[format]
  const next = { ...career }
  if (partners === null) {
    if (!current.length) throw new Error('Você ainda não formou essa equipe.')
    if (format === 'mixed') next.mixedPartnerId = null
    else if (format === 'tag') next.tagPartnerId = null
    else next.trioPartnerIds = null
    if (next.preferredFormat === format) next.preferredFormat = TEAM_FORMATS.find(option => careerTeamPartners(next, option).length) ?? 'singles'
    const name = fighterNames(career, [PLAYER_ID, ...current])
    vacatePlayerTitles(next, title => defenseFormat(title) === format, 'A equipe de ' + name + ' foi encerrada.')
    addHistory(next, 'team', 'Fim da equipe', name + ' encerraram a formação de ' + label + '.', promotion)
    if (next.titleProposal) {
      const issue = titleProposalIssue(next, titleStates(next), next.titleProposal, next.date)
      if (issue) recordTitleDecision(next, next.titleProposal, 'cancelled', issue)
    }
    return next
  }
  if (current.length) throw new Error('Encerre a formação atual antes de escolher novos parceiros.')
  const available = availableTeamPartners(career, format)
  if (partners.length !== size - 1 || new Set(partners).size !== partners.length || partners.some(id => !available.some(fighter => fighter.id === id))) {
    throw new Error('Selecione lutadores diferentes e disponíveis para esta equipe.')
  }
  if (format === 'mixed') next.mixedPartnerId = partners[0]
  else if (format === 'tag') next.tagPartnerId = partners[0]
  else next.trioPartnerIds = [partners[0], partners[1]]
  next.preferredFormat = format
  addHistory(next, 'team', format === 'trios' ? 'Novo trio' : 'Nova ' + label,
    fighterNames(next, [PLAYER_ID, ...partners]) + ' formaram uma equipe.', promotion)
  return next
}

export function signOffer(career: Career, offerId: string): Career {
  const offer = currentOffer(career, offerId)
  const { promotion, weeks, pay, winBonus } = offer
  const next: Career = {
    ...career, offers: [],
    contract: { promotion, weeks, pay, winBonus, start: career.date, end: addDays(career.date, weeks * 7), status: 'active' },
  }
  if ((career.tagPartnerId || career.trioPartnerIds || career.mixedPartnerId) && career.contract?.promotion !== promotion) {
    next.tagPartnerId = null
    next.trioPartnerIds = null
    next.mixedPartnerId = null
    if (isTeamFormat(next.preferredFormat)) next.preferredFormat = 'singles'
    addHistory(next, 'team', 'Fim das parcerias', 'Sua mudança de empresa ou brand encerrou as equipes anteriores.', career.contract?.promotion)
  }
  vacatePlayerTitles(next, title => title.promotion !== promotion, 'Você assinou com ' + ORGANIZATIONS[promotion].name + '.')
  if (next.titleProposal) {
    const issue = titleProposalIssue(next, titleStates(next), next.titleProposal, next.date)
    if (issue) recordTitleDecision(next, next.titleProposal, 'cancelled', issue)
  }
  const renewal = career.contract?.promotion === promotion && career.contract.status === 'expired'
  addHistory(next, 'contract', (renewal ? 'Renovação com ' : 'Contrato com ') + ORGANIZATIONS[promotion].name,
    'Acordo de ' + weeks + ' semanas, com $' + pay + ' por show disputado.', promotion)
  return next
}

export function nextCareerShow(career: Career): Show | undefined {
  if (career.contract?.status !== 'active') return upcomingShows(career.worldThrough, 1, career.calendar)[0]
  const show = nextShowForCareer(career.contract.promotion, career.worldThrough, career.calendar,
    event => !event.series || career.profile.division === 'men')
  return show && show.date < career.contract.end ? show : undefined
}

function bookRival(career: Career, show: Show, candidates: readonly RosterEntry[], random: Random, rivalries: RivalryStates) {
  const target = overall(career.profile.attributes, career.profile.style) + Math.floor(career.popularity / 9)
  let lastRival: string | undefined
  for (let index = career.shows.length - 1; index >= 0 && !lastRival; index--) {
    lastRival = career.shows[index].matches.find(match => match.player && !match.tag)?.secondId
  }
  return random.weighted(candidates, fighter => {
    const series = matchRivalry(rivalries, show, PLAYER_ID, fighter.id)
    const ready = series && rematchReady(series, show.date)
    const interest = ready ? (series.active ? 24 : 4) : fighter.id === lastRival ? 0.28 : 1
    return interest * Math.max(1, 19 - Math.abs(target - overall(fighter.attributes, fighter.style)))
  })
}

function npcRematch(rivalries: RivalryStates, show: Show, pool: readonly RosterEntry[], random: Random) {
  const ids = new Set(pool.map(fighter => fighter.id))
  const ready = [...rivalries.values()].filter(rivalry => (
    rivalry.fighters.every(id => ids.has(id)) && rematchReady(rivalry, show.date)
    && matchRivalry(rivalries, show, ...rivalry.fighters) === rivalry
  ))
  const active = ready.filter(rivalry => rivalry.active)
  if (active.length && random.next() < 0.78) return random.pick(active).fighters
  if (ready.length && random.next() < 0.24) return random.pick(ready).fighters
  return undefined
}

function matchResult(id: string, first: Fighter, second: Fighter, bout: Bout, player: boolean): MatchResult {
  if (!bout.finish) throw new Error('Uma luta em andamento não tem resultado.')
  const fields = {
    id, firstId: first.id, secondId: second.id, method: bout.finish.method, rounds: bout.turn,
    player, ...(bout.titleId ? { titleId: bout.titleId } : {}),
  }
  if (bout.multi) return {
    ...fields, winnerId: bout.finish.winnerId,
    multi: { otherIds: bout.multi.opponents.slice(1).map(entry => entry.id), defeatedId: bout.finish.defeatedId },
  }
  const starterId = bout.finish.winner === 'player' ? first.id : second.id
  return {
    ...fields, winnerId: legalFighterId(bout, bout.finish.winner, starterId),
    ...(bout.tournamentId ? { tournamentId: bout.tournamentId } : {}),
    ...(bout.tag ? { tag: {
      firstPartners: bout.tag.player.partners.map(partner => partner.id),
      secondPartners: bout.tag.rival.partners.map(partner => partner.id),
      ...(bout.tag.mixed ? { mixed: true as const } : {}),
    } } : {}),
  }
}

function addTitleHistory(career: Career, show: Show, match: MatchResult, states: BeltStates) {
  if (!match.titleId) return
  const title = TITLES_BY_ID.get(match.titleId)!
  const previous = states.get(match.titleId)?.holders
  applyTitleMatch(states, career, show, match)
  const winners = matchWinners(match)
  const verb = previous && sameTeam(previous, winners) ? (match.tag ? ' retiveram ' : ' reteve ') : (match.tag ? ' conquistaram ' : ' conquistou ')
  addHistory(career, 'title', fighterNames(career, winners) + verb + titleName(career, title, show.date),
    show.name + ' · ' + METHOD_LABEL[match.method], title.promotion, match.player)
}

function addCompetitionHistory(career: Career, show: Show, match: MatchResult, rivalries: RivalryStates) {
  const update = trackRivalry(rivalries, show, match)
  if (update) {
    const { fighters, wins, promotion } = update.rivalry
    const headline = update.kind === 'started'
      ? 'Rivalidade entre ' + fighterNames(career, fighters)
      : fighterName(career, match.winnerId) + ' venceu a rivalidade'
    addHistory(career, 'rivalry', headline, fighterNames(career, fighters) + ' · ' + wins.join('–') + ' na série · ' + show.name, promotion)
  }
  const edition = match.tournamentId && tournamentEdition(match.tournamentId, career.calendar)
  if (!edition) return
  const round = edition.shows.findIndex(event => event.id === show.id)
  const winner = fighterName(career, match.winnerId)
  const headline = round === edition.shows.length - 1
    ? winner + ' conquistou ' + edition.name : winner + ' venceu no ' + edition.name
  addHistory(career, 'tournament', headline, roundName(edition, round) + ' · ' + show.name + ' · ' + METHOD_LABEL[match.method], edition.promotion)
}

function playerTitleOpportunity(career: Career, show: Show, states: BeltStates, occupied: Set<string>, random: Random, rivalries: RivalryStates, defensesOnly: boolean, priorityTitle?: TitleRecord) {
  const contract = career.contract
  if (!contract) return undefined
  const due = beltsDue(show, states, 21).filter(title => (
    defenseFormat(title) === 'singles' && title.promotion === contract.promotion && titleEligible(career, title, PLAYER_ID)
  ))
  const defense = priorityTitle && defenseFormat(priorityTitle) === 'singles' ? priorityTitle
    : due.find(title => states.get(title.id)?.holders?.includes(PLAYER_ID))
  const contenders = rosterFor(contract.promotion, false).filter(fighter => (
    fighter.division === career.profile.division && fighter.id !== career.tagPartnerId
    && !career.trioPartnerIds?.includes(fighter.id) && !occupied.has(fighter.id) && fitsEventRoster(show, fighter.id)
  ))
  if (defense) {
    const challengers = contenders.filter(fighter => titleEligible(career, defense, fighter.id))
    if (challengers.length) return { title: defense, rival: bookRival(career, show, challengers, random, rivalries) }
  }

  if (defensesOnly || career.popularity < 18 || recordFor(career, PLAYER_ID, true).wins < 3) return undefined
  const position = rankingsFor(career, contract.promotion, career.profile.division, show.date).find(row => row.fighterId === PLAYER_ID)?.position
  if (!position || position > CONTENDER_LIMIT) return undefined
  for (const title of due) {
    const holders = states.get(title.id)?.holders
    if (holders === null) {
      const challengers = contenders.filter(fighter => titleEligible(career, title, fighter.id))
      if (challengers.length) return { title, rival: bookRival(career, show, challengers, random, rivalries) }
    }
    const rival = holders ? ROSTER_BY_ID.get(holders[0]) : undefined
    if (rival && !occupied.has(rival.id) && fitsEventRoster(show, rival.id)) return { title, rival }
  }
  return undefined
}

function playerLineup(player: Fighter, partners: readonly RosterEntry[]): WrestlingTeam<Fighter> {
  const [first, second] = partners
  return second ? [player, first, second] : [player, first]
}

function npcTeamPool(career: Career, pool: readonly RosterEntry[], format: TeamFormat) {
  const reserved = careerTeamPartners(career, format)
  return pool.filter(fighter => !reserved.includes(fighter.id))
}

function bookShow(career: Career, show: Show, random: Random, playerBooked: boolean, occupied: Set<string>, states: BeltStates,
  rivalries: RivalryStates, fixtures: readonly TournamentFixture[]): ShowReport {
  const circuits = showPromotions(show)
  const eligible = ROSTER.filter(fighter => (
    fitsEventRoster(show, fighter.id) && !occupied.has(fighter.id)
      && (circuits.includes(fighter.promotion) || (show.special && circuits.some(circuit => wrestlerAppearsIn(fighter, circuit))))
  ))
  const playerCandidates = eligible.filter(fighter => fighter.division === career.profile.division)
  const soloCandidates = playerCandidates.filter(fighter => fighter.id !== career.tagPartnerId && !career.trioPartnerIds?.includes(fighter.id))
  const playerFixture = fixtures.find(fixture => fixture.fighters.includes(PLAYER_ID))
  const tournamentRival = playerFixture && ROSTER_BY_ID.get(playerFixture.fighters.find(id => id !== PLAYER_ID)!)
  const ordinaryBooking = playerBooked && !playerFixture
  const approved = career.titleProposal?.approvedOn ? TITLES_BY_ID.get(career.titleProposal.titleId) : undefined
  const priorityTitle = approved && showSupportsTitle(show, approved) ? approved : undefined
  const soloDefense = ordinaryBooking && (!priorityTitle || defenseFormat(priorityTitle) === 'singles')
    ? playerTitleOpportunity(career, show, states, occupied, random, rivalries, true, priorityTitle) : undefined
  const team = ordinaryBooking && !soloDefense && (career.tagPartnerId || career.trioPartnerIds || career.mixedPartnerId)
    ? playerTeamBooking(career, show, states, eligible, occupied, random, priorityTitle) : undefined
  const opportunity = soloDefense ?? (ordinaryBooking && !team && !isTeamFormat(career.preferredFormat)
    ? playerTitleOpportunity(career, show, states, occupied, random, rivalries, false) : undefined)
  const rival = tournamentRival ?? team?.opponents[0] ?? opportunity?.rival
    ?? (ordinaryBooking && soloCandidates.length ? bookRival(career, show, soloCandidates, random, rivalries) : undefined)
  const playerTitle = team?.title ?? opportunity?.title
  const extraRivals: RosterEntry[] = []
  const unificationMatch = playerTitle && playerTitle.id === priorityTitle?.id
  if (rival && ordinaryBooking && !team && !unificationMatch && isMultiFormat(career.preferredFormat)) {
    const pool = soloCandidates.filter(fighter => fighter.id !== rival.id && (!playerTitle || titleEligible(career, playerTitle, fighter.id)))
    while (pool.length && extraRivals.length < MULTI_SIZE[career.preferredFormat] - 2) {
      const extra = bookRival(career, show, pool, random, rivalries)
      extraRivals.push(extra)
      pool.splice(pool.indexOf(extra), 1)
    }
  }
  if (rival) occupied.add(rival.id)
  for (const fighter of extraRivals) occupied.add(fighter.id)
  if (team) for (const fighter of [...team.partners, ...team.opponents]) occupied.add(fighter.id)
  const matches: MatchResult[] = []
  const titleNight = show.special || show.promotion === 'bwf' || dayDistance(START_DATE, show.date) % 28 < 7
  const titlesDue = titleNight ? beltsDue(show, states, 35) : []
  const form = new Map<string, number>()
  for (const report of career.shows.slice(-24)) {
    for (const result of report.matches) {
      for (const winner of matchWinners(result)) form.set(winner, (form.get(winner) ?? 0) + 1)
    }
  }

  for (const division of DIVISIONS) {
    const fixture = fixtures.find(item => item !== playerFixture && item.edition.division === division)
    if (fixture) {
      const id = show.id + '/match-' + (matches.length + 1)
      const first = ROSTER_BY_ID.get(fixture.fighters[0])!
      const second = ROSTER_BY_ID.get(fixture.fighters[1])!
      const bout = simulateSingles(show, id, first, second, random)
      bout.tournamentId = fixture.edition.editionId
      const result = matchResult(id, first, second, bout, false)
      matches.push(result)
      addCompetitionHistory(career, show, result, rivalries)
    }
    const open = eligible.filter(fighter => !occupied.has(fighter.id))
    const pool = open.filter(fighter => fighter.division === division)
    const title = titlesDue.find(belt => {
      const format = defenseFormat(belt)!
      if ((belt.division !== division && !(format === 'mixed' && division === 'men'))
        || belt.id === playerTitle?.id || (hasLiveBout(career) && belt.id === career.bout?.titleId)) return false
      const holders = states.get(belt.id)?.holders ?? []
      if (holders.some(id => id === PLAYER_ID || occupied.has(id) || !fitsEventRoster(show, id))) return false
      const titlePool = format === 'singles' ? pool : npcTeamPool(career, format === 'mixed' ? open : pool, format)
      const contenders = titlePool.filter(fighter => !holders.includes(fighter.id) && titleEligible(career, belt, fighter.id))
      if (format === 'mixed') return hasMixedTeams(contenders, holders.length ? 1 : 2)
      const size = format === 'singles' ? 1 : TEAM_SIZE[format]
      return contenders.length >= 2 * size - holders.length
    })
    if (!title && (fixture || pool.length < 2)) continue
    const holders = title ? states.get(title.id)?.holders : undefined
    let format = title ? defenseFormat(title)! : 'singles'
    const titlePool = title ? (format === 'mixed' ? open : pool).filter(fighter => titleEligible(career, title, fighter.id)) : pool
    const rematch = !title ? npcRematch(rivalries, show, pool, random) : undefined
    const individualSpecial = format === 'singles' && !rematch && show.special && !show.series && titlePool.length >= 3
    const multiSize = individualSpecial && random.next() < 0.32
      ? titlePool.length >= 4 && random.next() < 0.55 ? 4 : 3 : 0
    if (!title && !rematch && !multiSize && show.special) {
      const hasTrios = !show.series && OPENING_TITLES.some(belt => circuits.includes(belt.promotion) && defenseFormat(belt) === 'trios')
      if (hasTrios && npcTeamPool(career, titlePool, 'trios').length >= 6) format = 'trios'
      else if (npcTeamPool(career, titlePool, 'tag').length >= 4) format = 'tag'
    }
    const id = show.id + '/match-' + (matches.length + 1)
    let first: RosterEntry
    let second: RosterEntry
    let bout: Bout
    if (format !== 'singles') {
      const teamPool = npcTeamPool(career, titlePool, format)
      const home = holders ? rosterTeam(holders) : pickRosterTeam(format, teamPool, random, form)
      const challengers = teamPool.filter(fighter => home.every(member => member.id !== fighter.id))
      const opposing = pickRosterTeam(format, challengers, random, form, home[0].division)
      first = home[0]
      second = opposing[0]
      bout = simulateTag(show, id, { player: home, rival: opposing }, random)
    } else {
      const booked = holders?.[0] ?? rematch?.[0]
      first = (booked && ROSTER_BY_ID.get(booked)) || random.pick(titlePool)
      const contenders = titlePool.filter(fighter => fighter.id !== first.id)
      const points = title ? new Map(rankingsFor(career, title.promotion, division, show.date).map(row => [row.fighterId, row.points])) : undefined
      const pick = (pool: readonly RosterEntry[]) => points
        ? random.weighted(pool, fighter => 1 + (points.get(fighter.id) ?? 0) + overall(fighter.attributes, fighter.style) / 45) : random.pick(pool)
      second = rematch ? ROSTER_BY_ID.get(rematch[1])! : pick(contenders)
      const lineup = [first, second]
      while (lineup.length < multiSize) lineup.push(pick(contenders.filter(fighter => !lineup.includes(fighter))))
      bout = multiSize ? simulateMulti(show, id, lineup, random) : simulateSingles(show, id, first, second, random)
    }
    if (title) bout.titleId = title.id
    const result = matchResult(id, first, second, bout, false)
    for (const team of matchTeams(result)) for (const member of team) occupied.add(member)
    matches.push(result)
    addTitleHistory(career, show, result, states)
    addCompetitionHistory(career, show, result, rivalries)
  }

  if (rival) {
    const id = show.id + '/career'
    const player = playerFor(career)
    career.bout = team
      ? createTagBout(show, id, { player: playerLineup(player, team.partners), rival: team.opponents }, career.difficulty, random)
      : extraRivals.length ? createMultiBout(show, id, [player, rival, ...extraRivals], career.difficulty, random)
        : createBout(show, id, rival, career.difficulty, random)
    if (playerTitle) career.bout.titleId = playerTitle.id
    if (playerFixture && !career.bout.multi) career.bout.tournamentId = playerFixture.edition.editionId
    const opponents = namesList.format((team?.opponents ?? [rival, ...extraRivals]).map(fighter => fighter.name))
    const format = team?.format ?? (extraRivals.length ? multiFormatForSize(extraRivals.length + 2) : 'singles')
    const stakes = playerFixture ? playerFixture.edition.name + ' · ' + roundName(playerFixture.edition, playerFixture.round)
      : [unificationMatch ? 'Luta de unificação' : MATCH_FORMAT_LABEL[format],
        playerTitle && titleName(career, playerTitle, show.date)].filter(Boolean).join(' · ')
    addHistory(career, 'match', 'Luta marcada contra ' + opponents, show.name + ' · ' + stakes, show.promotion, true)
  } else if (matches.length) {
    const mainEvent = matches.at(-1)!
    addHistory(career, 'show', show.name, fighterNames(career, matchWinners(mainEvent))
      + (mainEvent.tag ? ' venceram por ' : ' venceu por ') + METHOD_LABEL[mainEvent.method] + '.', show.promotion)
  } else {
    addHistory(career, 'show', show.name, 'O card foi adiado por disponibilidade do elenco.', show.promotion)
  }
  return { ...show, matches }
}
function recordTitleDecision(career: Career, pair: TitlePair, status: TitleDecision['status'], reason: string) {
  const { titleId, secondaryId } = pair
  career.titleDecision = { titleId, secondaryId, date: career.date, status, reason }
  if (status !== 'approved') career.titleProposal = null
  const headlines = { approved: 'Unificação aprovada', rejected: 'Unificação recusada', cancelled: 'Unificação cancelada',
    unified: 'Unificação de campeonatos' }
  addHistory(career, 'title', headlines[status], reason, TITLES_BY_ID.get(titleId)!.promotion, true)
}

function reviewTitleProposal(career: Career, states: BeltStates) {
  const pair = career.titleProposal
  if (!pair || pair.approvedOn) return
  const issue = titleReviewIssue(career, states, pair, career.date)
  if (issue) {
    recordTitleDecision(career, pair, 'rejected', issue)
    return
  }
  career.titleProposal = { ...pair, approvedOn: career.date }
  recordTitleDecision(career, pair, 'approved', 'A diretoria aprovou a luta. Se você defender o título principal, o segundo cinturão será incorporado.')
}

function keepTitleProposalCurrent(career: Career, states: BeltStates) {
  const pair = career.titleProposal
  if (!pair) return
  const issue = titleProposalIssue(career, states, pair, career.date)
  if (issue) recordTitleDecision(career, pair, 'cancelled', issue)
}

function reviewBefore(career: Career, states: BeltStates, date: string) {
  const pair = career.titleProposal
  if (!pair || pair.approvedOn || pair.reviewOn > date) return
  career.date = pair.reviewOn
  reviewTitleProposal(career, states)
}

export function setTitleProposal(career: Career, pair: TitlePair | null): Career {
  if (hasLiveBout(career)) throw new Error('Finalize o combate antes de alterar a proposta.')
  if (!pair) {
    if (!career.titleProposal) return career
    const next = { ...career }
    recordTitleDecision(next, career.titleProposal, 'cancelled', 'Você retirou o pedido antes da luta.')
    return next
  }
  if (career.titleProposal) throw new Error('Já existe uma proposta em andamento.')
  const states = titleStates(career)
  const issue = titleProposalIssue(career, states, pair, career.date)
  if (issue) throw new Error(issue)
  const reviewOn = addDays(career.date, UNIFICATION_REVIEW_DAYS)
  const next: Career = {
    ...career, titleProposal: { ...pair, requestedOn: career.date, reviewOn, approvedOn: null }, titleDecision: null,
  }
  addHistory(next, 'title', 'Proposta de unificação recebida', 'A diretoria responde em até três dias da carreira.',
    TITLES_BY_ID.get(pair.titleId)!.promotion, true)
  if (immediateUnification(next, states, pair)) reviewTitleProposal(next, states)
  return next
}

export function pendingUnificationBout(career: Career) {
  return !!career.titleProposal?.approvedOn && hasLiveBout(career) && career.bout?.titleId === career.titleProposal.titleId
}

function createUnification(career: Career, show: ShowReport, states: BeltStates, pair: TitlePair, result: MatchResult) {
  const title = TITLES_BY_ID.get(pair.titleId)!
  const secondary = TITLES_BY_ID.get(pair.secondaryId)!
  const state = states.get(title.id)!
  const org = ORGANIZATIONS[title.promotion]
  const name = unifiedTitleName(title, secondary)
  const prestige = titlePrestige(title, state.defenses, true)
  const artwork = beltArtworkFor({
    title: name, promotion: org.name, accent: org.accent, company: org.company, prestige,
    lineage: [title.name, secondary.name], reason: 'unification', formerDesign: state.designs?.at(-1)?.artwork,
    seed: career.rng + '|' + show.id,
  })
  const change: TitleChange = {
    kind: 'unification', titleId: title.id, secondaryId: secondary.id, date: show.date, showId: show.id,
    name, artwork, prestige, proposed: result.player, matchId: result.id, champions: [...matchWinners(result)],
  }
  applyTitleChange(states, show, change)
  career.titleChanges = [...career.titleChanges, change]
  const detail = name + ' · ' + show.name + ' · ' + fighterNames(career, change.champions!) + ' · ' + METHOD_LABEL[result.method] + '.'
  if (result.player) recordTitleDecision(career, pair, 'unified', detail)
  else addHistory(career, 'title', 'Unificação de campeonatos', detail, title.promotion)
}

function closeBeltOffice(career: Career, shows: readonly ShowReport[], states: BeltStates) {
  const agendas = shows.filter(show => show.special)
    .flatMap(show => showPromotions(show).map(promotion => ({ show, promotion })))
  for (const { show, promotion } of agendas) {
    if (career.titleChanges.some(change => change.showId === show.id && TITLES_BY_ID.get(change.titleId)?.promotion === promotion)) continue
    const titles = OPENING_TITLES.filter(title => title.promotion === promotion && showSupportsTitle(show, title))
    const defenses = show.matches.filter(match => match.titleId && !match.player)
    // An NPC merger follows a successful defense on this card by the team holding both belts.
    const decision = defenses.flatMap(match => {
      const defended = TITLES_BY_ID.get(match.titleId!)!
      const state = states.get(defended.id)
      if (defended.promotion !== promotion || !state?.holders || !sameTeam(state.holders, matchWinners(match)) || !state.defenses) return []
      return titles.flatMap(other => {
        if (!compatibleTitles(defended, other)) return []
        const pair = { titleId: defended.id, secondaryId: other.id }
        if (!canUnify(states, pair)) return []
        const { defenses, gap } = unificationStats(states, pair)
        return defenses >= 4 && gap <= 28 ? [{ pair, match }] : []
      })
    })[0]
    if (decision) {
      createUnification(career, show, states, decision.pair, decision.match)
      continue
    }
    const lastChange = career.titleChanges.filter(change => TITLES_BY_ID.get(change.titleId)?.promotion === promotion).at(-1)
    if (lastChange && dayDistance(lastChange.date, show.date) < 150) continue
    const title = titles.find(title => {
      const state = states.get(title.id)!
      return canRedesign(state, show.date) && state.events.some(event => event.kind === 'defense')
    })
    if (!title) continue
    const state = states.get(title.id)!
    const champion = state.holders && state.defenses >= 4 && dayDistance(state.heldFrom, show.date) >= 100 ? [...state.holders] : undefined
    const kind = champion ? 'personalized' : 'redesign'
    const prestige = titlePrestige(title, state.defenses, Boolean(state.designs?.some(change => change.kind === 'unification')))
    const name = titleName(career, title)
    const org = ORGANIZATIONS[promotion]
    const artwork = beltArtworkFor({
      title: name, promotion: org.name, accent: org.accent, company: org.company, prestige, lineage: [title.name],
      reason: kind, formerDesign: state.designs?.at(-1)?.artwork, seed: career.rng + '|' + show.id,
    })
    const fields = { titleId: title.id, date: show.date, showId: show.id, artwork, prestige }
    const change: TitleChange = champion ? { ...fields, kind: 'personalized', champion } : { ...fields, kind: 'redesign' }
    applyTitleChange(states, show, change)
    career.titleChanges = [...career.titleChanges, change]
    const detail = champion ? 'A diretoria homenageou o reinado de ' + fighterNames(career, champion) + '.'
      : 'A diretoria atualizou a identidade visual após um ciclo de mudanças de campeão.'
    addHistory(career, 'title', 'Novo design de cinturão', name + ' · ' + detail + ' ' + show.name + '.', promotion)
  }
}

function advanceThrough(career: Career, target: string): Career {
  const random = new Random(career.rng)
  const shows = showsThrough(career.worldThrough, target, career.calendar)
  const next: Career = { ...career, shows: [...career.shows], date: target, worldThrough: target }
  const states = titleStates(career)
  const rivalries = rivalryStates(career.shows)
  for (let start = 0; start < shows.length;) {
    const date = shows[start].date
    let end = start + 1
    while (shows[end]?.date === date) end++
    const today = shows.slice(start, end)
    reviewBefore(next, states, date)
    next.date = date
    keepTitleProposalCurrent(next, states)
    const firstReport = next.shows.length
    const { fields, entries, fixtures } = planTournaments(next, today)
    next.tournamentFields = fields
    next.tournamentEntries = entries
    const occupied = new Set([...fixtures.values()].flatMap(card => card.flatMap(item => item.fighters)))
    for (const show of today) {
      const card = fixtures.get(show.id) ?? []
      const playerBooked = !occupied.has(PLAYER_ID) && !hasLiveBout(next) && next.contract?.status === 'active'
        && showPromotions(show).includes(next.contract.promotion) && (!show.series || next.profile.division === 'men')
        && show.date >= next.contract.start && show.date < next.contract.end
      next.shows.push(bookShow(next, show, random, playerBooked, occupied, states, rivalries, card))
    }
    if (!hasLiveBout(next)) closeBeltOffice(next, next.shows.slice(firstReport), states)
    start = end
  }
  reviewBefore(next, states, target)
  next.date = target
  keepTitleProposalCurrent(next, states)
  next.rng = random.state
  if (next.contract?.status === 'active' && target >= next.contract.end) {
    const { promotion } = next.contract
    next.contract = { ...next.contract, status: 'expired' }
    addHistory(next, 'contract', 'Contrato encerrado', 'Seu vínculo com ' + ORGANIZATIONS[promotion].name + ' chegou ao fim.', promotion)
    next.offers = offersFor(next, random)
    next.rng = random.state
  }
  return next
}

export function advanceCareer(career: Career): Career {
  if (hasLiveBout(career)) throw new Error('Finalize a luta em andamento antes de avançar.')
  const next = nextCareerShow(career)
  const target = next?.date ?? career.contract?.end
  if (!target) return career
  return advanceThrough(career, target)
}

export function advanceCalendarBy(career: Career, days: 1 | 7): Career {
  if (hasLiveBout(career)) throw new Error('Finalize a luta em andamento antes de avançar.')
  const target = addDays(career.date, days)
  if (career.contract?.status !== 'active') return advanceThrough(career, target)
  const boundary = nextCareerShow(career)?.date ?? career.contract.end
  return advanceThrough(career, target < boundary ? target : boundary)
}

export function renewOffers(career: Career): Career {
  if (career.contract?.status === 'active' || career.offers.some(offer => offer.status === 'available')) {
    throw new Error('Encerre as propostas atuais para consultar o mercado de novo.')
  }
  const next = advanceThrough(career, addDays(career.date, 7))
  const random = new Random(next.rng)
  addHistory(next, 'contract', 'Nova rodada de propostas', 'Uma semana passou. O mercado apresentou três novas propostas.')
  next.offers = offersFor(next, random)
  next.rng = random.state
  return next
}

export function resolvePlayerTurn(career: Career, action: string): Career {
  const current = career.bout
  if (!current || current.finish) throw new Error('Avance até um show para receber uma luta.')
  const opponentIds = current.multi ? current.multi.opponents.map(opponent => opponent.id) : [current.rivalId]
  const opponents = opponentIds.map(id => ROSTER_BY_ID.get(id)!)
  const [rival] = opponents
  const show = career.shows.find(report => report.id === current.showId)
  const contract = career.contract
  if (opponents.some(fighter => !fighter) || !show || contract?.status !== 'active') throw new Error('O save não tem os dados necessários para continuar esta luta.')
  const random = new Random(career.rng)
  const fighter = playerFor(career)
  const bout = current.multi
    ? playMultiTurn(current, [fighter, ...opponents], career.difficulty, action, random)
    : isTagBout(current) ? playTagTurn(current, {
      player: playerLineup(fighter, current.tag.player.partners.map(partner => ROSTER_BY_ID.get(partner.id)!)),
      rival: rosterTeam(cornerFighterIds(current, 'rival', rival.id)),
    }, career.difficulty, action, random)
    : playTurn(current, fighter, rival, career.difficulty, action, random)
  const next: Career = { ...career, bout, rng: random.state }
  if (!bout.finish) return next

  const result = matchResult(bout.id, fighter, rival, bout, true)
  const won = matchWinners(result).includes(PLAYER_ID)
  const variety = new Set(bout.used).size
  const rivalries = rivalryStates(career.shows)
  const series = !bout.tag && !bout.multi ? matchRivalry(rivalries, show, PLAYER_ID, rival.id) : undefined
  const edition = bout.tournamentId ? tournamentEdition(bout.tournamentId, career.calendar) : undefined
  const champion = edition && won && edition.shows.at(-1)?.id === show.id
  const xp = 24 + (won ? 24 : 0) + Math.min(14, variety * 2) + (show.special ? 10 : 0) + (bout.titleId ? 15 : 0)
    + (series?.active && !series.winnerId ? 8 : 0) + (edition ? 10 : 0) + (champion ? 25 : 0)
  bout.xpAwarded = xp
  next.xp += xp
  next.popularity = clamp(next.popularity + (won ? 4 : 1) + (show.special ? 2 : 0), 0, 100)
  const states = titleStates(career)
  addTitleHistory(next, show, result, states)
  addCompetitionHistory(next, show, result, rivalries)
  next.shows = career.shows.map(report => report.id === show.id ? { ...report, matches: [...report.matches, result] } : report)
  next.ledger = [...career.ledger, { id: bout.id, date: show.date, label: show.name + (won ? ' · participação e vitória' : ' · participação'), amount: contract.pay + (won ? contract.winBonus : 0) }]
  const headline = result.multi ? (won ? 'Vitória em ' : 'Derrota em ') + MATCH_FORMAT_LABEL[matchFormat(result)]
    : (won ? 'Vitória sobre ' : 'Derrota para ') + fighterNames(career, matchTeams(result)[1])
  const fall = result.multi ? fighterName(career, result.winnerId) + ' finalizou ' + fighterName(career, result.multi.defeatedId) + ' · ' : ''
  addHistory(next, 'match', headline, show.name + ' · ' + fall + METHOD_LABEL[bout.finish.method] + ' · +' + xp + ' XP', show.promotion, true)
  addHistory(next, 'show', show.name, 'Card encerrado com ' + (show.matches.length + 1) + ' lutas.', show.promotion)
  if (career.titleProposal && pendingUnificationBout(career)) {
    const home = next.shows.find(report => report.id === show.id)!
    if (won && canUnify(states, career.titleProposal)) createUnification(next, home, states, career.titleProposal, result)
    else recordTitleDecision(next, career.titleProposal, 'cancelled', 'A unificação foi cancelada após a perda do título principal. O outro cinturão mantém o próprio reinado.')
  }
  keepTitleProposalCurrent(next, states)
  closeBeltOffice(next, next.shows.filter(report => report.date === show.date), states)
  return next
}

export const attributeCost = (value: number) => 7 + Math.floor((value - 40) / 5) * 3
export const moveCost = (level: number) => 18 + level * 16

export function moveUnlockIssue(career: Career, id: string) {
  const unlock = MOVE_BY_ID.get(id)?.unlock
  if (!unlock || career.profile.unlockedMoves?.includes(id)) return 'Golpe já disponível.'
  if (hasLiveBout(career)) return 'Finalize a luta antes de alterar o moveset.'
  if (career.profile.attributes[unlock.attribute] < unlock.minimum) return 'Requer ' + ATTRIBUTE_NAMES[unlock.attribute] + ' ' + unlock.minimum + '.'
  if (career.xp < unlock.xp) return 'Requer ' + unlock.xp + ' XP.'
  return null
}

export function unlockMove(career: Career, id: string): Career {
  const issue = moveUnlockIssue(career, id)
  if (issue) throw new Error(issue)
  const move = MOVE_BY_ID.get(id)!
  const next = { ...career, xp: career.xp - move.unlock!.xp, profile: {
    ...career.profile, unlockedMoves: [...(career.profile.unlockedMoves ?? []), id],
  } }
  addHistory(next, 'progression', move.name + ' aprendido', 'Golpe disponível no catálogo.')
  return next
}

export function changeCareerMove(career: Career, id: string, replaced: string): Career {
  if (hasLiveBout(career)) throw new Error('Finalize a luta antes de alterar o moveset.')
  const move = MOVE_BY_ID.get(id)
  if (move?.unlock && !career.profile.unlockedMoves?.includes(id)) throw new Error('Aprenda este golpe antes de equipá-lo.')
  return { ...career, profile: { ...career.profile, moves: swapMove(career.profile.moves, id, replaced) } }
}

export function improveAttribute(career: Career, attribute: Attribute): Career {
  if (hasLiveBout(career)) throw new Error('A evolução fica disponível após a luta.')
  const current = career.profile.attributes[attribute]
  const cost = attributeCost(current)
  if (current >= ATTRIBUTE_CAP || career.xp < cost) throw new Error('O atributo está no teto ou o XP é insuficiente.')
  const next: Career = {
    ...career, xp: career.xp - cost,
    profile: { ...career.profile, attributes: { ...career.profile.attributes, [attribute]: current + 1 } },
  }
  addHistory(next, 'progression', ATTRIBUTE_NAMES[attribute] + ' subiu para ' + (current + 1), 'Investimento de ' + cost + ' XP.')
  return next
}

export function improveMove(career: Career, id: string): Career {
  if (hasLiveBout(career)) throw new Error('A evolução fica disponível após a luta.')
  const move = MOVE_BY_ID.get(id)
  const level = career.profile.moveLevels[id] ?? 0
  const cost = moveCost(level)
  if (!move || !career.profile.moves.includes(id) || level >= 3 || career.xp < cost) throw new Error('Golpe indisponível para evolução ou XP insuficiente.')
  const next: Career = {
    ...career, xp: career.xp - cost,
    profile: { ...career.profile, moveLevels: { ...career.profile.moveLevels, [id]: level + 1 } },
  }
  addHistory(next, 'progression', move.name + ' · nível ' + (level + 1), 'Investimento de ' + cost + ' XP.')
  return next
}

export function setDifficulty(career: Career, difficulty: Difficulty): Career {
  if (career.difficulty === difficulty) return career
  const next = { ...career, difficulty }
  addHistory(next, 'career', 'Dificuldade ' + DIFFICULTY_LABEL[difficulty], 'Alteração nas decisões táticas e negociações.')
  return next
}
