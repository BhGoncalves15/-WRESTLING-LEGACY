import type { MatchResult } from '../domain/model'

export function matchTeams(match: MatchResult): [string[], string[]] {
  if (match.tag) return [[match.firstId, match.tag.firstPartnerId], [match.secondId, match.tag.secondPartnerId]]
  return [[match.firstId], [match.secondId]]
}

export function matchWinners(match: MatchResult): string[] {
  const [first, second] = matchTeams(match)
  return first.includes(match.winnerId) ? first : second
}

export function sameTeam(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every(id => b.includes(id))
}
