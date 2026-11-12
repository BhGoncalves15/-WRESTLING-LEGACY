import { ROSTER_BY_ID, showPromotions } from '../content/catalog'
import { dayDistance, type MatchResult, type PromotionId, type Show, type ShowReport } from '../domain/model'

const COOLDOWN_DAYS = 28
const REMATCH_DAYS = 7
const INACTIVITY_DAYS = 49
const SERIES_DAYS = 84

export type Rivalry = {
  promotion: PromotionId
  fighters: readonly [string, string]
  wins: [number, number]
  started: string
  lastMeeting: string
  active: boolean
  winnerId?: string
}

export type RivalryStates = Map<string, Rivalry>

function onCircuit(show: Show, firstId: string, secondId: string) {
  const first = ROSTER_BY_ID.get(firstId)?.promotion
  const second = ROSTER_BY_ID.get(secondId)?.promotion
  const home = first ?? second
  return home && (!first || !second || first === second) && showPromotions(show).includes(home) ? home : show.promotion
}

function rivalryKey(promotion: PromotionId, fighters: readonly string[]) {
  return promotion + '/' + [...fighters].sort().join('+')
}

export function rivalryExpired(rivalry: Rivalry, date: string) {
  return dayDistance(rivalry.lastMeeting, date) > INACTIVITY_DAYS || dayDistance(rivalry.started, date) > SERIES_DAYS
}

function seriesOver(rivalry: Rivalry) {
  return rivalry.wins.some(wins => wins >= 2)
}

export function trackRivalry(states: RivalryStates, show: Show, match: MatchResult) {
  if (match.tag || match.multi) return undefined
  const fighters: Rivalry['fighters'] = match.firstId < match.secondId ? [match.firstId, match.secondId] : [match.secondId, match.firstId]
  const promotion = onCircuit(show, match.firstId, match.secondId)
  const key = rivalryKey(promotion, fighters)
  let prior = states.get(key)
  if (prior && seriesOver(prior) && dayDistance(prior.lastMeeting, show.date) <= COOLDOWN_DAYS) return undefined
  if (prior && (seriesOver(prior) || rivalryExpired(prior, show.date))) prior = undefined
  const wins: Rivalry['wins'] = prior ? [...prior.wins] : [0, 0]
  wins[match.winnerId === fighters[0] ? 0 : 1]++
  const active = Boolean(prior?.active || match.titleId || (wins[0] > 0 && wins[1] > 0))
  const rivalry: Rivalry = {
    promotion, fighters, wins, started: prior?.started ?? show.date, lastMeeting: show.date, active,
    ...(active && wins.some(count => count >= 2) ? { winnerId: match.winnerId } : {}),
  }
  states.set(key, rivalry)
  if (rivalry.winnerId) return { kind: 'resolved' as const, rivalry }
  if (active && !prior?.active) return { kind: 'started' as const, rivalry }
  return undefined
}

export function rivalryStates(shows: readonly ShowReport[]): RivalryStates {
  const states: RivalryStates = new Map()
  for (const show of shows) for (const match of show.matches) trackRivalry(states, show, match)
  return states
}

export function matchRivalry(states: RivalryStates, show: Show, first: string, second: string) {
  const state = states.get(rivalryKey(onCircuit(show, first, second), [first, second]))
  return state && !rivalryExpired(state, show.date) ? state : undefined
}

export function rematchReady(rivalry: Rivalry, date: string) {
  return !seriesOver(rivalry) && !rivalryExpired(rivalry, date) && dayDistance(rivalry.lastMeeting, date) >= REMATCH_DAYS
}
