import type { MatchFormat, MatchResult } from '../domain/model'

export function matchTeams(match: MatchResult): [string[], string[]] {
  return [[match.firstId, ...(match.tag?.firstPartners ?? [])], [match.secondId, ...(match.tag?.secondPartners ?? [])]]
}

export function formatForSize(size: number, mixed?: true): MatchFormat {
  if (mixed) return 'mixed'
  return size === 3 ? 'trios' : size === 2 ? 'tag' : 'singles'
}

export function matchWinners(match: MatchResult): string[] {
  const [first, second] = matchTeams(match)
  return first.includes(match.winnerId) ? first : second
}

export function sameTeam(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every(id => b.includes(id))
}
