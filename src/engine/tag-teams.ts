import { ROSTER_BY_ID, rosterFor } from '../content/roster'
import type { RosterEntry } from '../content/roster-model'
import { TEAM_REFERENCES } from '../content/tag-teams'
import { defenseSize, type TitleRecord } from '../content/titles'
import { TEAM_SIZE, overall, type Career, type Show, type TeamFormat, type TeamSize, type WrestlingTeam } from '../domain/model'
import { matchWinners, sameTeam } from './matches'
import type { Random } from './random'
import { beltsDue, CAREER_FIGHTER_ID, titleEligible, titleStates, type BeltStates } from './titles'

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
  return career.tagPartnerId ? [career.tagPartnerId] : []
}

export function availableTeamPartners(career: Career, format: TeamFormat, states?: BeltStates): RosterEntry[] {
  if (career.contract?.status !== 'active') return []
  const { promotion } = career.contract
  const size = TEAM_SIZE[format]
  const members = rosterFor(promotion).filter(fighter => fighter.division === career.profile.division)
  if (members.length < size * 2 - 1) return []
  const champions = new Set([...(states ?? titleStates(career)).values()].flatMap(state => state.holders?.length === size ? state.holders : []))
  return members.filter(fighter => fighter.promotion === promotion && !champions.has(fighter.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
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

export function pickRosterTeam(size: TeamSize, pool: readonly RosterEntry[], random: Random, form: ReadonlyMap<string, number> = new Map()): RosterTeam {
  if (pool.length < size) throw new Error('O elenco disponível não preenche a equipe.')
  const available = new Set(pool.map(fighter => fighter.id))
  const known = TEAM_REFERENCES.filter(team => team.members.length === size && team.members.every(id => available.has(id)))
  const score = (fighter: RosterEntry) => 1 + (form.get(fighter.id) ?? 0) * 2 + overall(fighter.attributes, fighter.style) / 45
  if (known.length && random.next() < 0.75) {
    const team = random.weighted(known, candidate => rosterTeam(candidate.members).reduce((total, fighter) => total + score(fighter), 0))
    return rosterTeam(team.members)
  }
  const first = random.weighted(pool, score)
  const pickMate = (chosen: readonly RosterEntry[]) => random.weighted(pool.filter(fighter => !chosen.includes(fighter)), fighter => (
    score(fighter) * (fighter.alignment === first.alignment ? 2 : 1)
  ))
  const second = pickMate([first])
  return size === 3 ? [first, second, pickMate([first, second])] : [first, second]
}

type PlayerTeamBooking = { partners: RosterEntry[]; opponents: RosterTeam; title?: TitleRecord }

export function playerTeamBooking(
  career: Career, show: Show, states: BeltStates, candidates: readonly RosterEntry[], occupied: ReadonlySet<string>, random: Random,
): PlayerTeamBooking | undefined {
  const due = beltsDue(show, states, 21).filter((title): title is TitleRecord & { rule: TeamFormat } => (
    (title.rule === 'tag' || title.rule === 'trios') && title.promotion === career.contract?.promotion && title.division === career.profile.division
  ))
  function lineup(format: TeamFormat) {
    const ids = careerTeamPartners(career, format)
    if (!ids.length || ids.some(id => occupied.has(id))) return undefined
    return { partners: ids.map(id => ROSTER_BY_ID.get(id)!), opponents: candidates.filter(fighter => !ids.includes(fighter.id)) }
  }

  for (const title of due) {
    if (!states.get(title.id)?.holders?.includes(CAREER_FIGHTER_ID)) continue
    const team = lineup(title.rule)
    const size = TEAM_SIZE[title.rule]
    const challengers = team?.opponents.filter(fighter => titleEligible(career, title, fighter.id))
    if (team && challengers && challengers.length >= size) {
      return { partners: team.partners, opponents: pickRosterTeam(size, challengers, random), title }
    }
  }

  const format = career.preferredFormat
  if (format === 'singles') return undefined
  const team = lineup(format)
  if (!team) return undefined
  const { partners, opponents } = team
  const size = TEAM_SIZE[format]
  const ids = partners.map(partner => partner.id)
  if (career.popularity >= 14 && teamRecordFor(career, ids).wins >= 2) {
    for (const title of due) {
      if (defenseSize(title) !== size) continue
      const holders = states.get(title.id)?.holders
      if (holders === null) {
        const contenders = opponents.filter(fighter => titleEligible(career, title, fighter.id))
        if (contenders.length >= size) return { partners, opponents: pickRosterTeam(size, contenders, random), title }
      } else if (holders?.every(id => id !== CAREER_FIGHTER_ID && !ids.includes(id) && !occupied.has(id))) {
        return { partners, opponents: rosterTeam(holders), title }
      }
    }
  }
  if (opponents.length >= size) return { partners, opponents: pickRosterTeam(size, opponents, random) }
  return undefined
}
