import {
  ANNOUNCED_SHOWS, ORGANIZATIONS, ROSTER_BY_ID, compareShows, nextShows, rosterFor, upcomingShows, type Fighter,
} from '../content/catalog'
import { MOVE_BY_ID, defaultMoves, validMoveset } from '../content/moves'
import {
  ATTRIBUTES, ATTRIBUTE_CAP, ATTRIBUTE_NAMES, DATA_VERSION, DIFFICULTY_LABEL, INITIAL_BUDGET, INITIAL_LIMIT,
  METHOD_LABEL, PROMOTIONS, SAVE_VERSION, START_DATE, addDays, clamp, overall, pointsSpent, profileSchema,
  suggestedAttributes, type Attribute, type Bout, type Career, type Difficulty, type HistoryItem, type MatchResult,
  type Offer, type Profile, type PromotionId, type Show, type ShowReport,
} from '../domain/model'
import { createBout, playTurn, simulateSingles } from './combat'
import { Random } from './random'

export const PLAYER_ID = 'career-player'

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

function offersFor(career: Career, random: Random): Offer[] {
  const ovr = overall(career.profile.attributes, career.profile.style)
  const premium = career.difficulty === 'easy' ? 1.06 : career.difficulty === 'hard' ? 0.91 : 1
  const order: PromotionId[] = ['nxt', 'tna', 'roh']
  return order.map(promotion => {
    const org = ORGANIZATIONS[promotion]
    const pay = Math.round(org.basePay * premium * (0.83 + (ovr - 55) * 0.008 + career.popularity * 0.004 + random.next() * 0.17) / 5) * 5
    const weeks = random.pick(promotion === 'nxt' ? [16, 20, 24] : [12, 16, 20])
    return {
      id: 'offer-' + career.history.length + '-' + promotion, promotion, weeks, pay,
      winBonus: Math.round(pay * 0.25), status: 'available', response: 'pending',
    }
  })
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
    bout: null, shows: [], history: [], ledger: [],
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
  addHistory(next, 'contract', 'Contrato com ' + ORGANIZATIONS[promotion].name,
    'Acordo de ' + weeks + ' semanas, com $' + pay + ' por show disputado.', promotion)
  return next
}

export function nextCareerShow(career: Career): Show | undefined {
  if (career.contract?.status !== 'active') return upcomingShows(career.worldThrough, 1)[0]
  const show = nextShows(career.contract.promotion, career.worldThrough, 1)[0]
  return show.date < career.contract.end ? show : undefined
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

function bookRival(career: Career, show: Show, random: Random) {
  const roster = rosterFor(show.promotion).filter(fighter => fighter.division === career.profile.division)
  const target = overall(career.profile.attributes, career.profile.style) + Math.floor(career.popularity / 9)
  const lastRival = [...career.shows].reverse().flatMap(report => report.matches).find(match => match.player)?.secondId
  return random.weighted(roster, fighter => (
    (fighter.id === lastRival ? 0.28 : 1) * Math.max(1, 19 - Math.abs(target - overall(fighter.attributes, fighter.style)))
  ))
}

function matchResult(id: string, first: Fighter, second: Fighter, bout: Bout, player: boolean): MatchResult {
  const finish = bout.finish
  if (!finish) throw new Error('Uma luta em andamento não tem resultado.')
  return {
    id, firstId: first.id, secondId: second.id, winnerId: finish.winner === 'player' ? first.id : second.id,
    method: finish.method, rounds: bout.turn, player,
  }
}

function bookShow(career: Career, show: Show, random: Random, playerBooked: boolean): ShowReport {
  const rival = playerBooked ? bookRival(career, show, random) : null
  const roster = rosterFor(show.promotion).filter(fighter => fighter.id !== rival?.id)
  const matches = (['men', 'women'] as const).map((division, index) => {
    const candidates = roster.filter(fighter => fighter.division === division)
    const first = random.pick(candidates)
    const second = random.pick(candidates.filter(fighter => fighter.id !== first.id))
    const id = show.id + '/match-' + (index + 1)
    return matchResult(id, first, second, simulateSingles(show, id, first, second, random), false)
  })
  if (rival) {
    career.bout = createBout(show, show.id + '/career', rival, career.difficulty, random)
    addHistory(career, 'match', 'Luta marcada contra ' + rival.name, show.name + ' · Singles', show.promotion)
  } else {
    const mainEvent = matches.at(-1)!
    addHistory(career, 'show', show.name, fighterName(career, mainEvent.winnerId) + ' venceu por ' + METHOD_LABEL[mainEvent.method] + '.', show.promotion)
  }
  return { ...show, matches }
}

function advanceThrough(career: Career, target: string): Career {
  const random = new Random(career.rng)
  const shows = dueShows(career.worldThrough, target)
  const next: Career = { ...career, shows: [...career.shows], date: target, worldThrough: target }
  for (const show of shows) {
    next.date = show.date
    const playerBooked = next.contract?.status === 'active' && next.contract.promotion === show.promotion
      && show.date >= next.contract.start && show.date < next.contract.end
    if (playerBooked && hasLiveBout(next)) throw new Error('Finalize a luta em andamento para seguir o calendário.')
    next.shows.push(bookShow(next, show, random, playerBooked))
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
  const xp = 24 + (won ? 24 : 0) + Math.min(14, variety * 2) + (show.special ? 10 : 0)
  bout.xpAwarded = xp
  next.xp += xp
  next.popularity = clamp(next.popularity + (won ? 4 : 1) + (show.special ? 2 : 0), 0, 100)
  const result = matchResult(bout.id, fighter, rival, bout, true)
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

export function showEvidence(id: string): string | undefined {
  return ANNOUNCED_SHOWS.find(show => show.id === id)?.source
}
