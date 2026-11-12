import {
  ORGANIZATIONS, ROSTER, ROSTER_BY_ID, TITLES_BY_ID, compareShows, nextShowForCareer, nextShows, rosterFor,
  showPromotions, upcomingShows, wrestlerAppearsIn, type Fighter, type RosterEntry,
} from '../content/catalog'
import { MOVE_BY_ID, defaultMoves, validMoveset } from '../content/moves'
import {
  ATTRIBUTES, ATTRIBUTE_CAP, ATTRIBUTE_NAMES, DATA_VERSION, DIFFICULTY_LABEL, INITIAL_BUDGET, INITIAL_LIMIT,
  DIVISIONS, METHOD_LABEL, OPENING_OFFER_COUNT, PROMOTIONS, SAVE_VERSION, START_DATE,
  addDays, clamp, dayDistance, overall, pointsSpent, profileSchema,
  suggestedAttributes, type Attribute, type Bout, type Career, type Difficulty, type HistoryItem, type MatchResult,
  type Offer, type Profile, type PromotionId, type Show, type ShowReport,
} from '../domain/model'
import { createBout, playTurn, simulateSingles } from './combat'
import { Random } from './random'
import { applyTitleMatch, beltsDue, CAREER_FIGHTER_ID, titleEligible, titleStates, type BeltStates } from './titles'

export const PLAYER_ID = CAREER_FIGHTER_ID
export { showEvidence } from '../content/calendar'

export function exampleProfile(): Profile {
  return {
    name: 'BH', nickname: '', country: 'Brasil', city: '', age: 23, division: 'men',
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

export function recordFor(career: Career, fighterId: string) {
  let wins = 0
  let losses = 0
  for (const show of career.shows) {
    for (const match of show.matches) {
      if (match.winnerId === fighterId) wins++
      else if (match.firstId === fighterId || match.secondId === fighterId) losses++
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
    bout: null, shows: [], expandedOn: null, vacatedTitles: [], history: [], ledger: [],
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

export function signOffer(career: Career, offerId: string): Career {
  const offer = currentOffer(career, offerId)
  const { promotion, weeks, pay, winBonus } = offer
  const next: Career = {
    ...career, offers: [],
    contract: { promotion, weeks, pay, winBonus, start: career.date, end: addDays(career.date, weeks * 7), status: 'active' },
  }
  for (const [titleId, state] of titleStates(career)) {
    const title = TITLES_BY_ID.get(titleId)!
    if (state.holderId === PLAYER_ID && title.promotion !== promotion) {
      next.vacatedTitles = [...next.vacatedTitles, { titleId, date: next.date }]
      addHistory(next, 'title', title.name + ' ficou vago', 'Você assinou com ' + ORGANIZATIONS[promotion].name + '.', title.promotion)
    }
  }
  addHistory(next, 'contract', 'Contrato com ' + ORGANIZATIONS[promotion].name,
    'Acordo de ' + weeks + ' semanas, com $' + pay + ' por show disputado.', promotion)
  return next
}

export function nextCareerShow(career: Career): Show | undefined {
  if (career.contract?.status !== 'active') return upcomingShows(career.worldThrough, 1)[0]
  const show = nextShowForCareer(career.contract.promotion, career.worldThrough)
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

function bookRival(career: Career, candidates: readonly RosterEntry[], random: Random) {
  const target = overall(career.profile.attributes, career.profile.style) + Math.floor(career.popularity / 9)
  let lastRival: string | undefined
  for (let index = career.shows.length - 1; index >= 0 && !lastRival; index--) {
    lastRival = career.shows[index].matches.find(match => match.player)?.secondId
  }
  return random.weighted(candidates, fighter => (
    (fighter.id === lastRival ? 0.28 : 1) * Math.max(1, 19 - Math.abs(target - overall(fighter.attributes, fighter.style)))
  ))
}

function matchResult(id: string, first: Fighter, second: Fighter, bout: Bout, player: boolean): MatchResult {
  const finish = bout.finish
  if (!finish) throw new Error('Uma luta em andamento não tem resultado.')
  return {
    id, firstId: first.id, secondId: second.id, winnerId: finish.winner === 'player' ? first.id : second.id,
    method: finish.method, rounds: bout.turn, player, ...(bout.titleId ? { titleId: bout.titleId } : {}),
  }
}

function addTitleHistory(career: Career, show: Show, match: MatchResult, states: BeltStates) {
  if (!match.titleId) return
  const title = TITLES_BY_ID.get(match.titleId)!
  const previous = states.get(match.titleId)?.holderId
  applyTitleMatch(states, career, show, match)
  const winner = fighterName(career, match.winnerId)
  addHistory(career, 'title', winner + (previous === match.winnerId ? ' reteve ' : ' conquistou ') + title.name,
    show.name + ' · ' + METHOD_LABEL[match.method], title.promotion)
}

function playerTitleOpportunity(career: Career, show: Show, states: BeltStates, occupied: Set<string>, random: Random) {
  const contract = career.contract
  if (!contract) return undefined
  const due = beltsDue(show, states, 21).filter(title => (
    title.promotion === contract.promotion && title.division === career.profile.division
  ))
  const defense = due.find(title => states.get(title.id)?.holderId === PLAYER_ID)
  const contenders = rosterFor(contract.promotion, false).filter(fighter => fighter.division === career.profile.division && !occupied.has(fighter.id))
  if (defense && contenders.length) return { title: defense, rival: bookRival(career, contenders, random) }

  if (career.popularity < 18 || recordFor(career, PLAYER_ID).wins < 3) return undefined
  for (const title of due) {
    const holder = states.get(title.id)?.holderId
    if (holder === null && contenders.length) return { title, rival: bookRival(career, contenders, random) }
    const rival = holder ? ROSTER_BY_ID.get(holder) : undefined
    if (rival && !occupied.has(rival.id)) return { title, rival }
  }
  return undefined
}

function bookShow(career: Career, show: Show, random: Random, playerBooked: boolean, occupied: Set<string>, states: BeltStates): ShowReport {
  const circuits = showPromotions(show)
  const eligible = ROSTER.filter(fighter => (
    !occupied.has(fighter.id) && (circuits.includes(fighter.promotion) || (show.special && circuits.some(circuit => wrestlerAppearsIn(fighter, circuit))))
  ))
  const playerCandidates = eligible.filter(fighter => fighter.division === career.profile.division)
  const opportunity = playerBooked ? playerTitleOpportunity(career, show, states, occupied, random) : undefined
  const rival = opportunity?.rival ?? (playerBooked && playerCandidates.length ? bookRival(career, playerCandidates, random) : undefined)
  if (rival) occupied.add(rival.id)
  const matches: MatchResult[] = []
  const titleNight = show.special || show.promotion === 'bwf' || dayDistance(START_DATE, show.date) % 28 < 7
  const titlesDue = titleNight ? beltsDue(show, states, 35) : []
  const form = new Map<string, number>()
  for (const report of career.shows.slice(-24)) {
    for (const result of report.matches) form.set(result.winnerId, (form.get(result.winnerId) ?? 0) + 1)
  }

  for (const division of DIVISIONS) {
    const pool = eligible.filter(fighter => fighter.division === division && !occupied.has(fighter.id))
    const title = titlesDue.find(belt => {
      if (belt.division !== division || belt.id === opportunity?.title.id || (hasLiveBout(career) && belt.id === career.bout?.titleId)) return false
      const holder = states.get(belt.id)?.holderId
      if (holder === PLAYER_ID || (holder && occupied.has(holder))) return false
      return pool.filter(fighter => fighter.id !== holder && titleEligible(career, belt, fighter.id)).length >= (holder ? 1 : 2)
    })
    if (pool.length < 2 && !title) continue
    const state = title ? states.get(title.id) : undefined
    const champion = state?.holderId ? ROSTER_BY_ID.get(state.holderId) : undefined
    const titlePool = title ? pool.filter(fighter => titleEligible(career, title, fighter.id)) : pool
    const first = champion ?? random.pick(titlePool)
    const contenders = titlePool.filter(fighter => fighter.id !== first.id)
    const second = title
      ? random.weighted(contenders, fighter => 1 + (form.get(fighter.id) ?? 0) * 2 + overall(fighter.attributes, fighter.style) / 45)
      : random.pick(contenders)
    occupied.add(first.id)
    occupied.add(second.id)
    const id = show.id + '/match-' + (matches.length + 1)
    const bout = simulateSingles(show, id, first, second, random)
    if (title) bout.titleId = title.id
    const result = matchResult(id, first, second, bout, false)
    matches.push(result)
    addTitleHistory(career, show, result, states)
  }

  if (rival) {
    career.bout = createBout(show, show.id + '/career', rival, career.difficulty, random)
    if (opportunity) career.bout.titleId = opportunity.title.id
    addHistory(career, 'match', 'Luta marcada contra ' + rival.name,
      show.name + ' · ' + (opportunity?.title.name ?? 'Singles'), show.promotion)
  } else if (matches.length) {
    const mainEvent = matches.at(-1)!
    addHistory(career, 'show', show.name, fighterName(career, mainEvent.winnerId) + ' venceu por ' + METHOD_LABEL[mainEvent.method] + '.', show.promotion)
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
  let date = ''
  let occupied = new Set<string>()
  for (const show of shows) {
    if (date !== show.date) {
      date = show.date
      occupied = new Set()
    }
    next.date = show.date
    const playerBooked = !hasLiveBout(next) && next.contract?.status === 'active' && showPromotions(show).includes(next.contract.promotion)
      && show.date >= next.contract.start && show.date < next.contract.end
    next.shows.push(bookShow(next, show, random, playerBooked, occupied, states))
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
  const bout = playTurn(current, fighter, rival, career.difficulty, action, random)
  const next: Career = { ...career, bout, rng: random.state }
  if (!bout.finish) return next

  const won = bout.finish.winner === 'player'
  const variety = new Set(bout.used).size
  const xp = 24 + (won ? 24 : 0) + Math.min(14, variety * 2) + (show.special ? 10 : 0) + (bout.titleId ? 15 : 0)
  bout.xpAwarded = xp
  next.xp += xp
  next.popularity = clamp(next.popularity + (won ? 4 : 1) + (show.special ? 2 : 0), 0, 100)
  const result = matchResult(bout.id, fighter, rival, bout, true)
  addTitleHistory(next, show, result, titleStates(career))
  next.shows = career.shows.map(report => report.id === show.id ? { ...report, matches: [...report.matches, result] } : report)
  next.ledger = [...career.ledger, { id: bout.id, date: show.date, label: show.name + (won ? ' · participação e vitória' : ' · participação'), amount: contract.pay + (won ? contract.winBonus : 0) }]
  addHistory(next, 'match', (won ? 'Vitória sobre ' : 'Derrota para ') + rival.name,
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
