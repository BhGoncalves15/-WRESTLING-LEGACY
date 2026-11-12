import { isMultiFormat, type MatchFormat, type MatchResult, type MultiFormat, type TeamFormat } from '../domain/model'

export function matchTeams(match: MatchResult): [string[], string[], ...string[][]] {
  return [
    [match.firstId, ...(match.tag?.firstPartners ?? [])],
    [match.secondId, ...(match.tag?.secondPartners ?? [])],
    ...(match.multi?.otherIds.map(id => [id]) ?? []),
  ]
}

export function formatForSize(size: number, mixed?: true): 'singles' | TeamFormat {
  if (mixed) return 'mixed'
  return size === 3 ? 'trios' : size === 2 ? 'tag' : 'singles'
}

export const multiFormatForSize = (size: number): MultiFormat => size === 4 ? 'fatal-4-way' : 'triple-threat'

export function matchFormat(match: MatchResult): MatchFormat {
  return match.multi ? multiFormatForSize(2 + match.multi.otherIds.length) : formatForSize(1 + (match.tag?.firstPartners.length ?? 0), match.tag?.mixed)
}

export const titleMatchFormat = (format: MatchFormat) => isMultiFormat(format) ? 'singles' : format

export function matchWinners(match: MatchResult): string[] {
  return matchTeams(match).find(side => side.includes(match.winnerId))!
}

export function sameTeam(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every(id => b.includes(id))
}
