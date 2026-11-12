import { ROSTER_BY_ID, rosterFor } from '../content/roster'
import type { RosterEntry } from '../content/roster-model'
import { TAG_TEAM_REFERENCES } from '../content/tag-teams'
import { supportsTagDefense, type TitleRecord } from '../content/titles'
import { overall, type Career, type Show } from '../domain/model'
import { matchWinners } from './matches'
import type { Random } from './random'
import { beltsDue, CAREER_FIGHTER_ID, titleEligible, titleStates, type BeltStates } from './titles'

export type RosterTeam = readonly [RosterEntry, RosterEntry]

export function rosterTeam(ids: readonly string[]): RosterTeam {
  const [first, second] = ids.map(id => ROSTER_BY_ID.get(id))
  if (!first || !second || first.id === second.id || ids.length !== 2) throw new Error('A dupla precisa de dois lutadores diferentes do elenco.')
  return [first, second]
}

export function availableTagPartners(career: Career, states?: BeltStates): RosterEntry[] {
  if (career.contract?.status !== 'active') return []
  const { promotion } = career.contract
  const members = rosterFor(promotion, false).filter(fighter => fighter.division === career.profile.division)
  if (rosterFor(promotion).filter(fighter => fighter.division === career.profile.division).length < 3) return []
  const champions = new Set([...(states ?? titleStates(career)).values()].flatMap(state => state.holders?.length === 2 ? state.holders : []))
  return members.filter(fighter => !champions.has(fighter.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function tagRecordFor(career: Career, partnerId: string) {
  let wins = 0
  let losses = 0
  for (const show of career.shows) {
    for (const match of show.matches) {
      if (!match.player || match.tag?.firstPartnerId !== partnerId) continue
      if (matchWinners(match).includes(CAREER_FIGHTER_ID)) wins++
      else losses++
    }
  }
  return { wins, losses }
}

export function pickTagTeam(pool: readonly RosterEntry[], random: Random, form: ReadonlyMap<string, number> = new Map()): RosterTeam {
  const available = new Set(pool.map(fighter => fighter.id))
  const known = TAG_TEAM_REFERENCES.filter(team => team.members.every(id => available.has(id)))
  const score = (fighter: RosterEntry) => 1 + (form.get(fighter.id) ?? 0) * 2 + overall(fighter.attributes, fighter.style) / 45
  if (known.length && random.next() < 0.75) {
    const team = random.weighted(known, candidate => rosterTeam(candidate.members).reduce((total, fighter) => total + score(fighter), 0))
    return rosterTeam(team.members)
  }
  const first = random.weighted(pool, score)
  const second = random.weighted(pool.filter(fighter => fighter.id !== first.id), fighter => (
    score(fighter) * (fighter.alignment === first.alignment ? 2 : 1)
  ))
  return [first, second]
}

type PlayerTagBooking = { partner: RosterEntry; opponents: RosterTeam; title?: TitleRecord }

export function playerTagBooking(
  career: Career, show: Show, states: BeltStates, candidates: readonly RosterEntry[], occupied: ReadonlySet<string>, random: Random,
): PlayerTagBooking | undefined {
  const partner = career.tagPartnerId ? ROSTER_BY_ID.get(career.tagPartnerId) : undefined
  if (!partner || occupied.has(partner.id)) return undefined
  const opponents = candidates.filter(fighter => fighter.id !== partner.id)
  const due = beltsDue(show, states, 21).filter(title => (
    supportsTagDefense(title) && title.promotion === career.contract?.promotion && title.division === career.profile.division
  ))
  const defense = due.find(title => states.get(title.id)?.holders?.includes(CAREER_FIGHTER_ID))
  if (defense) {
    const challengers = opponents.filter(fighter => titleEligible(career, defense, fighter.id))
    if (challengers.length >= 2) return { partner, opponents: pickTagTeam(challengers, random), title: defense }
  }

  if (career.popularity >= 14 && tagRecordFor(career, partner.id).wins >= 2) {
    for (const title of due) {
      const holders = states.get(title.id)?.holders
      if (holders === null) {
        const contenders = opponents.filter(fighter => titleEligible(career, title, fighter.id))
        if (contenders.length >= 2) return { partner, opponents: pickTagTeam(contenders, random), title }
      } else if (holders?.every(id => id !== CAREER_FIGHTER_ID && id !== partner.id && !occupied.has(id))) {
        return { partner, opponents: rosterTeam(holders), title }
      }
    }
  }
  if (opponents.length >= 2) return { partner, opponents: pickTagTeam(opponents, random) }
  return undefined
}
