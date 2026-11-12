import { ROSTER_BY_ID, showPromotions, wrestlerAppearsIn } from '../content/catalog'
import { OPENING_TITLES, TITLES_BY_ID, supportsDefense, type TitleRecord } from '../content/titles'
import { START_DATE, dayDistance, type Career, type MatchResult, type Show } from '../domain/model'

export const CAREER_FIGHTER_ID = 'career-player'

type TitleEvent = {
  date: string
  from: string | null
  to: string | null
  kind: 'defense' | 'change' | 'vacancy'
}

export type BeltState = {
  holderId: string | null
  heldFrom: string
  lastDefense: string | null
  defenses: number
  events: TitleEvent[]
}

export type BeltStates = Map<string, BeltState>

export function showSupportsTitle(show: Show, title: TitleRecord): boolean {
  return supportsDefense(title) && showPromotions(show).includes(title.promotion)
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
  const participants = [match.firstId, match.secondId]
  if (!title || !state || !showSupportsTitle(show, title)
    || !participants.every(id => titleEligible(career, title, id))
    || (state.holderId && !participants.includes(state.holderId))) {
    throw new Error('A disputa de cinturão não corresponde à divisão, ao evento ou ao campeão vigente.')
  }
  const from = state.holderId
  const to = match.winnerId
  const retained = from === to
  state.holderId = to
  state.lastDefense = show.date
  state.heldFrom = retained ? state.heldFrom : show.date
  state.defenses = retained ? state.defenses + 1 : 0
  state.events.push({ date: show.date, from, to, kind: retained ? 'defense' : 'change' })
}

export function titleStates(career: Career): BeltStates {
  const states: BeltStates = new Map()
  for (const title of OPENING_TITLES) {
    if (supportsDefense(title)) states.set(title.id, {
      holderId: title.holderId ?? null, heldFrom: START_DATE, lastDefense: null, defenses: 0, events: [],
    })
  }
  let nextVacancy = 0
  const applyVacancy = ({ titleId, date }: Career['vacatedTitles'][number]) => {
    const state = states.get(titleId)
    if (state?.holderId !== CAREER_FIGHTER_ID) throw new Error('O lutador não detinha o cinturão na data da vacância.')
    state.events.push({ date, from: state.holderId, to: null, kind: 'vacancy' })
    state.holderId = null
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
