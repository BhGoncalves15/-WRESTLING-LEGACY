import { ROSTER_BY_ID, showPromotions, wrestlerAppearsIn } from '../content/catalog'
import { NJPW_JUNIOR_IDS, TAMASHII_IDS } from '../content/roster-njpw'
import { JUNIOR_WEIGHT_LIMIT, OPENING_TITLES, TITLES_BY_ID, defenseFormat, defenseSize, type TitleRecord } from '../content/titles'
import { START_DATE, dayDistance, type Career, type MatchResult, type Show } from '../domain/model'
import { matchFormat, matchTeams, matchWinners, sameTeam, titleMatchFormat } from './matches'

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
  return defenseFormat(title) !== undefined && showPromotions(show).includes(title.promotion)
    && (title.qualification === 'tamashii') === (show.series === 'tamashii')
}

export function fighterDivision(career: Career, id: string) {
  return id === CAREER_FIGHTER_ID ? career.profile.division : ROSTER_BY_ID.get(id)?.division
}

export function titleEligible(career: Career, title: TitleRecord, id: string): boolean {
  const division = fighterDivision(career, id)
  if (!division || (title.division !== 'mixed' && division !== title.division)) return false
  const player = id === CAREER_FIGHTER_ID
  if (!player && !wrestlerAppearsIn(ROSTER_BY_ID.get(id)!, title.promotion)) return false
  if (title.qualification === 'tamashii') return player || TAMASHII_IDS.has(id)
  if (title.qualification === 'junior') {
    const weight = career.profile.ringWeightKg
    return player ? weight !== null && weight <= JUNIOR_WEIGHT_LIMIT : NJPW_JUNIOR_IDS.has(id)
  }
  return true
}

export function titleTeamEligible(career: Career, title: TitleRecord, ids: readonly string[]) {
  return ids.length === defenseSize(title) && ids.every(id => titleEligible(career, title, id))
    && (title.division !== 'mixed' || fighterDivision(career, ids[0]) !== fighterDivision(career, ids[1]))
}

export function applyTitleMatch(states: BeltStates, career: Career, show: Show, match: MatchResult) {
  if (!match.titleId) return
  const title = TITLES_BY_ID.get(match.titleId)
  const state = states.get(match.titleId)
  const from = state?.holders ?? null
  const teams = matchTeams(match)
  if (!title || !state || !showSupportsTitle(show, title)
    || titleMatchFormat(matchFormat(match)) !== defenseFormat(title)
    || teams.some(team => !titleTeamEligible(career, title, team))
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
    if (defenseSize(title) !== undefined) states.set(title.id, {
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
