import { ROSTER_BY_ID, fitsEventRoster, rosterFor } from '../content/roster'
import type { RosterEntry } from '../content/roster-model'
import { TEAM_REFERENCES } from '../content/tag-teams'
import { TITLES_BY_ID, defenseFormat, type TitleRecord } from '../content/titles'
import { DIVISIONS, TEAM_SIZE, isTeamFormat, overall, type Career, type Division, type Show, type TeamFormat, type WrestlingTeam } from '../domain/model'
import { matchWinners, sameTeam } from './matches'
import type { Random } from './random'
import { beltsDue, CAREER_FIGHTER_ID, titleEligible, titleStates, titleTeamEligible, type BeltStates } from './titles'

export type RosterTeam = WrestlingTeam<RosterEntry>

export function rosterTeam(ids: readonly string[]): RosterTeam {
  const [first, second, third] = ids.map(id => ROSTER_BY_ID.get(id))
  if (new Set(ids).size !== ids.length || !first || !second || ids.length > 3 || (ids.length === 3 && !third)) {
    throw new Error('A equipe precisa de dois ou três lutadores diferentes do elenco.')
  }
  return third ? [first, second, third] : [first, second]
}

export function careerTeamPartners(career: Career, format: TeamFormat): readonly string[] {
  if (format === 'trios') return career.trioPartnerIds ?? []
  const partner = format === 'mixed' ? career.mixedPartnerId : career.tagPartnerId
  return partner ? [partner] : []
}

export function availableTeamPartners(career: Career, format: TeamFormat, states?: BeltStates): RosterEntry[] {
  if (career.contract?.status !== 'active') return []
  const { promotion } = career.contract
  const size = TEAM_SIZE[format]
  const division = career.profile.division
  const roster = rosterFor(promotion)
  const own = roster.filter(fighter => fighter.division === division)
  const opposite = roster.filter(fighter => fighter.division !== division)
  const mixed = format === 'mixed'
  if (mixed ? promotion !== 'aaa' || own.length < 1 || opposite.length < 2 : own.length < size * 2 - 1) return []
  const champions = new Set([...(states ?? titleStates(career))].flatMap(([id, state]) => (
    defenseFormat(TITLES_BY_ID.get(id)!) === format ? state.holders ?? [] : []
  )))
  const candidates = mixed ? opposite : own.filter(fighter => fighter.promotion === promotion)
  return candidates.filter(fighter => !champions.has(fighter.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function teamRecordFor(career: Career, partners: readonly string[]) {
  let wins = 0
  let losses = 0
  for (const show of career.shows) {
    for (const match of show.matches) {
      if (!match.player || !match.tag || !sameTeam(match.tag.firstPartners, partners)) continue
      if (matchWinners(match).includes(CAREER_FIGHTER_ID)) wins++
      else losses++
    }
  }
  return { wins, losses }
}

export function hasMixedTeams(pool: readonly RosterEntry[], count: number): boolean {
  return DIVISIONS.every(division => pool.filter(fighter => fighter.division === division).length >= count)
}

export function alignMixedTeam(team: RosterTeam, starter: Division): RosterTeam {
  return team[0].division === starter ? team : [team[1], team[0]]
}

export function pickRosterTeam(
  format: TeamFormat, pool: readonly RosterEntry[], random: Random, form: ReadonlyMap<string, number> = new Map(), starter: Division = 'men',
): RosterTeam {
  const size = TEAM_SIZE[format]
  const mixed = format === 'mixed'
  if (pool.length < size || (mixed && !hasMixedTeams(pool, 1))) throw new Error('O elenco disponível não preenche a equipe.')
  const available = new Set(pool.map(fighter => fighter.id))
  const known = TEAM_REFERENCES.filter(team => team.members.length === size && team.members.every(id => available.has(id))
    && (!mixed || ROSTER_BY_ID.get(team.members[0])?.division !== ROSTER_BY_ID.get(team.members[1])?.division))
  const score = (fighter: RosterEntry) => 1 + (form.get(fighter.id) ?? 0) * 2 + overall(fighter.attributes, fighter.style) / 45
  if (known.length && random.next() < 0.75) {
    const reference = random.weighted(known, candidate => rosterTeam(candidate.members).reduce((total, fighter) => total + score(fighter), 0))
    const team = rosterTeam(reference.members)
    return mixed ? alignMixedTeam(team, starter) : team
  }
  const first = random.weighted(mixed ? pool.filter(fighter => fighter.division === starter) : pool, score)
  const pickMate = (chosen: readonly RosterEntry[]) => random.weighted(pool.filter(fighter => (
    !chosen.includes(fighter) && (!mixed || fighter.division !== starter)
  )), fighter => score(fighter) * (fighter.alignment === first.alignment ? 2 : 1))
  const second = pickMate([first])
  return size === 3 ? [first, second, pickMate([first, second])] : [first, second]
}

type PlayerTeamBooking = { format: TeamFormat; partners: RosterEntry[]; opponents: RosterTeam; title?: TitleRecord }

export function playerTeamBooking(
  career: Career, show: Show, states: BeltStates, candidates: readonly RosterEntry[], occupied: ReadonlySet<string>, random: Random,
): PlayerTeamBooking | undefined {
  const division = career.profile.division
  const due = beltsDue(show, states, 21).flatMap(title => {
    const format = defenseFormat(title)
    return format && format !== 'singles' && title.promotion === career.contract?.promotion
      && (title.division === division || title.division === 'mixed') ? [{ title, format }] : []
  })
  function lineup(format: TeamFormat) {
    const ids = careerTeamPartners(career, format)
    if (!ids.length || ids.some(id => occupied.has(id) || !fitsEventRoster(show, id))) return undefined
    return {
      ids, partners: ids.map(id => ROSTER_BY_ID.get(id)!),
      opponents: candidates.filter(fighter => !ids.includes(fighter.id) && (format === 'mixed' || fighter.division === division)),
    }
  }
  const canPick = (format: TeamFormat, pool: readonly RosterEntry[]) => (
    format === 'mixed' ? hasMixedTeams(pool, 1) : pool.length >= TEAM_SIZE[format]
  )
  const pick = (format: TeamFormat, pool: readonly RosterEntry[]) => pickRosterTeam(format, pool, random, undefined, division)

  for (const { title, format } of due) {
    if (!states.get(title.id)?.holders?.includes(CAREER_FIGHTER_ID)) continue
    const team = lineup(format)
    if (!team || !titleTeamEligible(career, title, [CAREER_FIGHTER_ID, ...team.ids])) continue
    const challengers = team.opponents.filter(fighter => titleEligible(career, title, fighter.id))
    if (canPick(format, challengers)) return { format, partners: team.partners, opponents: pick(format, challengers), title }
  }

  const format = career.preferredFormat
  if (!isTeamFormat(format)) return undefined
  const team = lineup(format)
  if (!team) return undefined
  const { ids, partners, opponents } = team
  if (career.popularity >= 14 && teamRecordFor(career, ids).wins >= 2) {
    for (const candidate of due) {
      const { title } = candidate
      if (candidate.format !== format || !titleTeamEligible(career, title, [CAREER_FIGHTER_ID, ...ids])) continue
      const holders = states.get(title.id)?.holders
      if (holders === null) {
        const contenders = opponents.filter(fighter => titleEligible(career, title, fighter.id))
        if (canPick(format, contenders)) return { format, partners, opponents: pick(format, contenders), title }
      } else if (holders?.every(id => id !== CAREER_FIGHTER_ID && !ids.includes(id) && !occupied.has(id))) {
        const rivals = rosterTeam(holders)
        return { format, partners, opponents: format === 'mixed' ? alignMixedTeam(rivals, division) : rivals, title }
      }
    }
  }
  if (canPick(format, opponents)) return { format, partners, opponents: pick(format, opponents) }
  return undefined
}
