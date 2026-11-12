import { ROSTER_BY_ID, showPromotions, wrestlerAppearsIn } from '../content/catalog'
import { OPENING_TITLES, TITLES_BY_ID, supportsDefense, supportsTagDefense, type TitleRecord } from '../content/titles'
import { START_DATE, dayDistance, type Career, type MatchResult, type Show } from '../domain/model'
import { matchTeams, matchWinners, sameTeam } from './matches'

export const CAREER_FIGHTER_ID = 'career-player'

type TitleEvent = {
  date: string
  from: readonly string[] | null
  to: readonly string[] | null
  kind: 'defense' | 'change' | 'vacancy'
}

export type BeltState = {
  holders: readonly string[] | null
  heldFrom: string
  lastDefense: string | null
  defenses: number
  events: TitleEvent[]
}

export type BeltStates = Map<string, BeltState>

export function showSupportsTitle(show: Show, title: TitleRecord): boolean {
  return (supportsDefense(title) || supportsTagDefense(title)) && showPromotions(show).includes(title.promotion)
}

export function titleEligible(career: Career, title: TitleRecord, id: string): boolean {
  if (id === CAREER_FIGHTER_ID) return career.profile.division === title.division
  const fighter = ROSTER_BY_ID.get(id)
  return Boolean(fighter && fighter.division === title.division && wrestlerAppearsIn(fighter, title.promotion))
}

export function applyTitleMatch(states: BeltStates, career: Career, show: Show, match: MatchResult) {
  if (!match.titleId) return
  const title = TITLES_BY_ID.get(match.titleId)
  const state = states.get(match.titleId)
  const from = state?.holders ?? null
  const teams = matchTeams(match)
  if (!title || !state || !showSupportsTitle(show, title)
    || Boolean(match.tag) !== supportsTagDefense(title)
    || !teams.flat().every(id => titleEligible(career, title, id))
    || (from && !teams.some(team => sameTeam(team, from)))) {
    throw new Error('A disputa de cinturão não corresponde à divisão, ao evento ou ao campeão vigente.')
  }
  const to = matchWinners(match)
  const retained = from !== null && sameTeam(from, to)
  state.holders = to
  state.lastDefense = show.date
  state.heldFrom = retained ? state.heldFrom : show.date
  state.defenses = retained ? state.defenses + 1 : 0
  state.events.push({ date: show.date, from, to, kind: retained ? 'defense' : 'change' })
}

export function titleStates(career: Career): BeltStates {
  const states: BeltStates = new Map()
  for (const title of OPENING_TITLES) {
    if (supportsDefense(title) || supportsTagDefense(title)) states.set(title.id, {
      holders: title.holderTeam ?? (title.holderId ? [title.holderId] : null),
      heldFrom: START_DATE, lastDefense: null, defenses: 0, events: [],
    })
  }
  let nextVacancy = 0
  const applyVacancy = ({ titleId, date }: Career['vacatedTitles'][number]) => {
    const state = states.get(titleId)
    if (!state?.holders?.includes(CAREER_FIGHTER_ID)) throw new Error('O lutador não detinha o cinturão na data da vacância.')
    state.events.push({ date, from: state.holders, to: null, kind: 'vacancy' })
    state.holders = null
    state.heldFrom = date
    state.defenses = 0
  }
  for (const show of career.shows) {
    while (career.vacatedTitles[nextVacancy]?.date < show.date) applyVacancy(career.vacatedTitles[nextVacancy++])
    for (const match of show.matches) applyTitleMatch(states, career, show, match)
  }
  while (nextVacancy < career.vacatedTitles.length) applyVacancy(career.vacatedTitles[nextVacancy++])
  return states
}

export function beltsDue(show: Show, states: BeltStates, interval: number): TitleRecord[] {
  return OPENING_TITLES.filter(title => {
    const state = states.get(title.id)
    return state && showSupportsTitle(show, title) && (!state.lastDefense || dayDistance(state.lastDefense, show.date) >= interval)
  }).sort((a, b) => (states.get(a.id)?.lastDefense ?? '').localeCompare(states.get(b.id)?.lastDefense ?? ''))
}
