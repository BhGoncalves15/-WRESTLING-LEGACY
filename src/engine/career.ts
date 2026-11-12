import {
  OPENING_TITLES, ORGANIZATIONS, ROSTER, ROSTER_BY_ID, TITLES_BY_ID, compareShows, nextShowForCareer, nextShows, rosterFor,
  fitsEventRoster, showPromotions, upcomingShows, wrestlerAppearsIn, type Fighter, type RosterEntry,
} from '../content/catalog'
import { MOVE_BY_ID, defaultMoves, validMoveset } from '../content/moves'
import { defenseFormat, type TitleRecord } from '../content/titles'
import { roundName, tournamentEdition } from '../content/tournaments'
import {
  ATTRIBUTES, ATTRIBUTE_CAP, ATTRIBUTE_NAMES, DATA_VERSION, DIFFICULTY_LABEL, INITIAL_BUDGET, INITIAL_LIMIT,
  DIVISIONS, MATCH_FORMAT_LABEL, METHOD_LABEL, OPENING_OFFER_COUNT, PROMOTIONS, SAVE_VERSION, START_DATE, TEAM_FORMATS, TEAM_SIZE,
  addDays, clamp, dayDistance, overall, pointsSpent, profileSchema, ringWeightSchema,
  suggestedAttributes, type Attribute, type Bout, type Career, type Difficulty, type HistoryItem, type MatchFormat, type MatchResult,
  type Offer, type Profile, type PromotionId, type Show, type ShowReport, type TeamFormat, type WrestlingTeam,
} from '../domain/model'
import { createBout, playTurn, simulateSingles } from './combat'
import { matchTeams, matchWinners, sameTeam } from './matches'
import { Random } from './random'
import { CONTENDER_LIMIT, rankingsFor } from './rankings'
import { matchRivalry, rematchReady, rivalryStates, trackRivalry, type RivalryStates } from './rivalries'
import { cornerFighterIds, createTagBout, isTagBout, legalFighterId, playTagTurn, simulateTag } from './tag-combat'
import { availableTeamPartners, careerTeamPartners, hasMixedTeams, pickRosterTeam, playerTeamBooking, rosterTeam } from './tag-teams'
import { applyTitleMatch, beltsDue, CAREER_FIGHTER_ID, titleEligible, titleStates, type BeltStates } from './titles'
import { planTournaments, type TournamentFixture } from './tournaments'

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

export function recordFor(career: Career, fighterId: string, singlesOnly = false) {
  let wins = 0
  let losses = 0
  for (const show of career.shows) {
    for (const match of show.matches) {
      if (singlesOnly && match.tag) continue
      const team = matchTeams(match).find(side => side.includes(fighterId))
      if (team?.includes(match.winnerId)) wins++
      else if (team) losses++
    }
  }
  return { wins, losses, total: wins + losses }
}

export const balanceFor = (career: Career) => career.ledger.reduce((sum, item) => sum + item.amount, 0)
export const hasLiveBout = (career: Career) => career.bout?.finish === null

function addHistory(career: Career, kind: HistoryItem['kind'], title: string, detail: string, promotion: PromotionId | null = null) {
  career.history = [...career.history, {
    id: 'event-' + career.history.length, date: career.date, kind, title, detail, promotion,
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
    const promotion = random.weighted(remaining, id => {
      const org = ORGANIZATIONS[id]
      const appeal = ovr + career.popularity * 0.48
      const gap = org.prestige - appeal
      return gap > 0 ? Math.max(0.04, 1 - gap / 24) : 1 + (appeal - org.prestige) / 55
    })
    const org = ORGANIZATIONS[promotion]
    const pay = Math.round(org.basePay * premium * (0.83 + (ovr - 55) * 0.008 + career.popularity * 0.004 + random.next() * 0.17) / 5) * 5
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
  const profile = profileSchema.parse(input)
  if (pointsSpent(profile.attributes) !== INITIAL_BUDGET || ATTRIBUTES.some(key => profile.attributes[key] > INITIAL_LIMIT)) {
    throw new Error('Distribua os 180 pontos respeitando o limite inicial de 90.')
  }
  if (!validMoveset(profile.moves) || Object.keys(profile.moveLevels).length) throw new Error('Revise os 20 espaços do moveset.')
  const random = new Random(identity.seed ?? crypto.getRandomValues(new Uint32Array(1))[0])
  const career: Career = {
    schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, id: identity.id ?? crypto.randomUUID(), revision: 0,
    createdAt: identity.createdAt ?? Date.now(), mode: 'free', profile, difficulty, rng: random.state,
    date: START_DATE, worldThrough: addDays(START_DATE, -1), offers: [], contract: null, xp: 0, popularity: 6,
    bout: null, shows: [], expandedOn: null, vacatedTitles: [], tagPartnerId: null, trioPartnerIds: null,
    mixedPartnerId: null, preferredFormat: 'singles', tournamentEntries: [], tournamentFields: [], history: [], ledger: [],
  }
  career.offers = offersFor(career, random)
  career.rng = random.state
  addHistory(career, 'career', 'Início de carreira', profile.name + ' entrou no mercado com três propostas.')
  return career
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
      addHistory(career, 'title', title.name + ' ficou vago', reason, title.promotion)
    }
  }
}

export function setMatchPreference(career: Career, format: MatchFormat): Career {
  if (format !== 'singles' && careerTeamPartners(career, format).length === 0) {
    throw new Error('Forme a equipe antes de priorizar este formato.')
  }
  return { ...career, preferredFormat: format }
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
    next.preferredFormat = 'singles'
    addHistory(next, 'team', 'Fim das parcerias', 'Sua mudança de empresa ou brand encerrou as equipes anteriores.', career.contract?.promotion)
  }
  vacatePlayerTitles(next, title => title.promotion !== promotion, 'Você assinou com ' + ORGANIZATIONS[promotion].name + '.')
  addHistory(next, 'contract', 'Contrato com ' + ORGANIZATIONS[promotion].name,
    'Acordo de ' + weeks + ' semanas, com $' + pay + ' por show disputado.', promotion)
  return next
}

export function nextCareerShow(career: Career): Show | undefined {
  if (career.contract?.status !== 'active') return upcomingShows(career.worldThrough, 1)[0]
  let show = nextShowForCareer(career.contract.promotion, career.worldThrough)
  if (show?.series === 'tamashii' && career.profile.division === 'women') {
    show = nextShowForCareer(career.contract.promotion, show.date)
  }
  return show && show.date < career.contract.end ? show : undefined
}

function dueShows(after: string, to: string): Show[] {
  const due: Show[] = []
  for (const promotion of PROMOTIONS) {
    let cursor = after
    let show = nextShows(promotion, cursor, 1)[0]
    while (show.date <= to) {
      due.push(show)
      cursor = show.date
      show = nextShows(promotion, cursor, 1)[0]
    }
  }
  return due.sort(compareShows)
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
  const finish = bout.finish
  if (!finish) throw new Error('Uma luta em andamento não tem resultado.')
  const starterId = finish.winner === 'player' ? first.id : second.id
  return {
    id, firstId: first.id, secondId: second.id, winnerId: legalFighterId(bout, finish.winner, starterId),
    method: finish.method, rounds: bout.turn, player, ...(bout.titleId ? { titleId: bout.titleId } : {}),
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
  addHistory(career, 'title', fighterNames(career, winners) + verb + title.name,
    show.name + ' · ' + METHOD_LABEL[match.method], title.promotion)
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
  const edition = match.tournamentId && tournamentEdition(match.tournamentId)
  if (!edition) return
  const round = edition.shows.findIndex(event => event.id === show.id)
  const winner = fighterName(career, match.winnerId)
  const headline = round === edition.shows.length - 1
    ? winner + ' conquistou ' + edition.name : winner + ' venceu no ' + edition.name
  addHistory(career, 'tournament', headline, roundName(edition, round) + ' · ' + show.name + ' · ' + METHOD_LABEL[match.method], edition.promotion)
}

function playerTitleOpportunity(career: Career, show: Show, states: BeltStates, occupied: Set<string>, random: Random, rivalries: RivalryStates, defensesOnly: boolean) {
  const contract = career.contract
  if (!contract) return undefined
  const due = beltsDue(show, states, 21).filter(title => (
    defenseFormat(title) === 'singles' && title.promotion === contract.promotion && titleEligible(career, title, PLAYER_ID)
  ))
  const defense = due.find(title => states.get(title.id)?.holders?.includes(PLAYER_ID))
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
  const soloDefense = ordinaryBooking ? playerTitleOpportunity(career, show, states, occupied, random, rivalries, true) : undefined
  const team = ordinaryBooking && !soloDefense && (career.tagPartnerId || career.trioPartnerIds || career.mixedPartnerId)
    ? playerTeamBooking(career, show, states, eligible, occupied, random) : undefined
  const opportunity = soloDefense ?? (ordinaryBooking && !team && career.preferredFormat === 'singles'
    ? playerTitleOpportunity(career, show, states, occupied, random, rivalries, false) : undefined)
  const rival = tournamentRival ?? team?.opponents[0] ?? opportunity?.rival
    ?? (ordinaryBooking && soloCandidates.length ? bookRival(career, show, soloCandidates, random, rivalries) : undefined)
  const playerTitle = team?.title ?? opportunity?.title
  if (rival) occupied.add(rival.id)
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
    if (!title && !rematch && show.special) {
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
      second = rematch ? ROSTER_BY_ID.get(rematch[1])!
        : points ? random.weighted(contenders, fighter => 1 + (points.get(fighter.id) ?? 0) + overall(fighter.attributes, fighter.style) / 45)
          : random.pick(contenders)
      bout = simulateSingles(show, id, first, second, random)
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
    career.bout = team
      ? createTagBout(show, id, { player: playerLineup(playerFor(career), team.partners), rival: team.opponents }, career.difficulty, random)
      : createBout(show, id, rival, career.difficulty, random)
    if (playerTitle) career.bout.titleId = playerTitle.id
    if (playerFixture) career.bout.tournamentId = playerFixture.edition.editionId
    const opponents = team ? namesList.format(team.opponents.map(fighter => fighter.name)) : rival.name
    const format = team?.format ?? 'singles'
    const stakes = playerFixture ? playerFixture.edition.name + ' · ' + roundName(playerFixture.edition, playerFixture.round)
      : playerTitle?.name ?? MATCH_FORMAT_LABEL[format]
    addHistory(career, 'match', 'Luta marcada contra ' + opponents, show.name + ' · ' + stakes, show.promotion)
  } else if (matches.length) {
    const mainEvent = matches.at(-1)!
    addHistory(career, 'show', show.name, fighterNames(career, matchWinners(mainEvent))
      + (mainEvent.tag ? ' venceram por ' : ' venceu por ') + METHOD_LABEL[mainEvent.method] + '.', show.promotion)
  } else {
    addHistory(career, 'show', show.name, 'O card foi adiado por disponibilidade do elenco.', show.promotion)
  }
  return { ...show, matches }
}
function advanceThrough(career: Career, target: string): Career {
  const random = new Random(career.rng)
  const shows = dueShows(career.worldThrough, target)
  const next: Career = { ...career, shows: [...career.shows], date: target, worldThrough: target }
  const states = titleStates(career)
  const rivalries = rivalryStates(career.shows)
  for (let start = 0; start < shows.length;) {
    const date = shows[start].date
    let end = start + 1
    while (shows[end]?.date === date) end++
    const today = shows.slice(start, end)
    next.date = date
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
    start = end
  }
  next.date = target
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
  const rival = ROSTER_BY_ID.get(current.rivalId)
  const show = career.shows.find(report => report.id === current.showId)
  const contract = career.contract
  if (!rival || !show || contract?.status !== 'active') throw new Error('O save não tem os dados necessários para continuar esta luta.')
  const random = new Random(career.rng)
  const fighter = playerFor(career)
  const bout = isTagBout(current)
    ? playTagTurn(current, {
      player: playerLineup(fighter, current.tag.player.partners.map(partner => ROSTER_BY_ID.get(partner.id)!)),
      rival: rosterTeam(cornerFighterIds(current, 'rival', rival.id)),
    }, career.difficulty, action, random)
    : playTurn(current, fighter, rival, career.difficulty, action, random)
  const next: Career = { ...career, bout, rng: random.state }
  if (!bout.finish) return next

  const won = bout.finish.winner === 'player'
  const variety = new Set(bout.used).size
  const rivalries = rivalryStates(career.shows)
  const series = !bout.tag ? matchRivalry(rivalries, show, PLAYER_ID, rival.id) : undefined
  const edition = bout.tournamentId ? tournamentEdition(bout.tournamentId) : undefined
  const champion = edition && won && edition.shows.at(-1)?.id === show.id
  const xp = 24 + (won ? 24 : 0) + Math.min(14, variety * 2) + (show.special ? 10 : 0) + (bout.titleId ? 15 : 0)
    + (series?.active && !series.winnerId ? 8 : 0) + (edition ? 10 : 0) + (champion ? 25 : 0)
  bout.xpAwarded = xp
  next.xp += xp
  next.popularity = clamp(next.popularity + (won ? 4 : 1) + (show.special ? 2 : 0), 0, 100)
  const result = matchResult(bout.id, fighter, rival, bout, true)
  addTitleHistory(next, show, result, titleStates(career))
  addCompetitionHistory(next, show, result, rivalries)
  next.shows = career.shows.map(report => report.id === show.id ? { ...report, matches: [...report.matches, result] } : report)
  next.ledger = [...career.ledger, { id: bout.id, date: show.date, label: show.name + (won ? ' · participação e vitória' : ' · participação'), amount: contract.pay + (won ? contract.winBonus : 0) }]
  addHistory(next, 'match', (won ? 'Vitória sobre ' : 'Derrota para ') + fighterNames(career, matchTeams(result)[1]),
    show.name + ' · ' + METHOD_LABEL[bout.finish.method] + ' · +' + xp + ' XP', show.promotion)
  addHistory(next, 'show', show.name, 'Card encerrado com ' + (show.matches.length + 1) + ' lutas.', show.promotion)
  return next
}

export const attributeCost = (value: number) => 7 + Math.floor((value - 40) / 5) * 3
export const moveCost = (level: number) => 18 + level * 16

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
