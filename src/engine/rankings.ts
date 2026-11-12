import { rosterFor, showPromotions } from '../content/catalog'
import { addDays, overall, type Career, type Division, type PromotionId } from '../domain/model'
import { CAREER_FIGHTER_ID } from './titles'

export const RANKING_DAYS = 90
export const WIN_POINTS = 3
export const TOURNAMENT_BONUS = 2
export const CONTENDER_LIMIT = 8

export type Standing = {
  fighterId: string
  wins: number
  losses: number
  points: number
  position: number | null
}

export function rankingsFor(career: Career, promotion: PromotionId, division: Division, date = career.date): Standing[] {
  const byFighter = new Map<string, Pick<Standing, 'wins' | 'losses' | 'points'>>()
  const start = addDays(date, 1 - RANKING_DAYS)
  for (let index = career.shows.length - 1; index >= 0; index--) {
    const show = career.shows[index]
    if (show.date < start) break
    if (show.date > date || !showPromotions(show).includes(promotion)) continue
    for (const match of show.matches) {
      if (match.tag) continue
      const loser = match.winnerId === match.firstId ? match.secondId : match.firstId
      const winning = byFighter.get(match.winnerId) ?? { wins: 0, losses: 0, points: 0 }
      const losing = byFighter.get(loser) ?? { wins: 0, losses: 0, points: 0 }
      winning.wins++
      winning.points += WIN_POINTS + (match.tournamentId ? TOURNAMENT_BONUS : 0)
      losing.losses++
      byFighter.set(match.winnerId, winning)
      byFighter.set(loser, losing)
    }
  }
  const roster = rosterFor(promotion, false).filter(fighter => fighter.division === division)
  const members = career.contract?.status === 'active' && career.contract.promotion === promotion && career.profile.division === division
    ? [...roster, { ...career.profile, id: CAREER_FIGHTER_ID }] : roster
  const rows = members.map(fighter => ({
    fighterId: fighter.id, ...(byFighter.get(fighter.id) ?? { wins: 0, losses: 0, points: 0 }),
    ovr: overall(fighter.attributes, fighter.style),
  })).sort((a, b) => (
    Number(b.wins + b.losses > 0) - Number(a.wins + a.losses > 0)
    || b.points - a.points || b.wins - a.wins || a.losses - b.losses || b.ovr - a.ovr || a.fighterId.localeCompare(b.fighterId)
  ))
  return rows.map(({ fighterId, wins, losses, points }, index) => ({
    fighterId, wins, losses, points, position: wins + losses > 0 ? index + 1 : null,
  }))
}
