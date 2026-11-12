import { START_DATE, addDays, type Division, type PromotionId, type Show } from '../domain/model'
import { nextShows } from './calendar'
import { fitsEventRoster, rosterFor } from './roster'

type Tournament = {
  id: string
  name: string
  promotion: PromotionId
  finalDay: string
  divisions: readonly Division[]
  source?: string
} & ({ format: 'knockout' } | { format: 'groups'; winPoints: number; groups: readonly [string, string] })

const both = ['men', 'women'] as const
const TOURNAMENTS: readonly Tournament[] = [
  { id: 'raw-cup', name: 'Copa de Desafiantes do Raw', promotion: 'raw', finalDay: '07-04', divisions: both, format: 'knockout' },
  { id: 'sd-cup', name: 'Copa de Desafiantes do SmackDown', promotion: 'smackdown', finalDay: '09-18', divisions: both, format: 'knockout' },
  { id: 'nxt-cup', name: 'Copa de Desafiantes do NXT', promotion: 'nxt', finalDay: '04-17', divisions: both, format: 'knockout' },
  {
    id: 'continental-classic', name: 'Continental Classic', promotion: 'aew', finalDay: '12-27', divisions: ['men'],
    format: 'groups', winPoints: 3, groups: ['Liga Azul', 'Liga Dourada'], source: 'https://www.allelitewrestling.com/continental-classic',
  },
  { id: 'aew-cup', name: 'Copa de Desafiantes da AEW', promotion: 'aew', finalDay: '10-17', divisions: ['women'], format: 'knockout' },
  {
    id: 'new-japan-cup', name: 'New Japan Cup', promotion: 'njpw', finalDay: '03-21', divisions: ['men'], format: 'knockout',
    source: 'https://www.njpw.co.jp/636086',
  },
  {
    id: 'g1-climax', name: 'G1 Climax', promotion: 'njpw', finalDay: '08-16', divisions: ['men'],
    format: 'groups', winPoints: 2, groups: ['Bloco A', 'Bloco B'], source: 'https://www.njpw1972.com/champions/g1-climax',
  },
  { id: 'njpw-cup', name: 'Copa de Desafiantes da NJPW', promotion: 'njpw', finalDay: '06-14', divisions: ['women'], format: 'knockout' },
  { id: 'tna-cup', name: 'Copa de Desafiantes da TNA', promotion: 'tna', finalDay: '04-18', divisions: both, format: 'knockout' },
  { id: 'aaa-cup', name: 'Copa de Desafiantes da AAA', promotion: 'aaa', finalDay: '03-14', divisions: both, format: 'knockout' },
  { id: 'roh-cup', name: 'Copa de Desafiantes da ROH', promotion: 'roh', finalDay: '05-16', divisions: both, format: 'knockout' },
  { id: 'bwf-cup', name: 'Copa de Desafiantes da BWF', promotion: 'bwf', finalDay: '03-21', divisions: both, format: 'knockout' },
]

export type TournamentEdition = Tournament & {
  editionId: string
  division: Division
  shows: readonly Show[]
}

export const tournamentSize = (format: Tournament['format']) => format === 'knockout' ? 4 : 6

export function tournamentRoster(promotion: PromotionId, division: Division, opening: Show) {
  return rosterFor(promotion, false).filter(fighter => fighter.division === division && fitsEventRoster(opening, fighter.id))
}

const seasons = new Map<number, TournamentEdition[]>()
export const FIRST_SEASON = Number(START_DATE.slice(0, 4))
export const seasonOf = (date: string) => Number(date.slice(0, 4))

export function editionsForSeason(year: number): readonly TournamentEdition[] {
  if (year < FIRST_SEASON || year > 9999) return []
  const cached = seasons.get(year)
  if (cached) return cached
  const editions = TOURNAMENTS.flatMap(tournament => {
    const target = year + '-' + tournament.finalDay
    const final = nextShows(tournament.promotion, addDays(target, -1), 3).find(show => !show.series)!
    const before = nextShows(tournament.promotion, addDays(final.date, -100), 40)
      .filter(show => show.date >= START_DATE && show.date < final.date && !show.series)
    const roundsBeforeFinal = tournament.format === 'knockout' ? 2 : 6
    if (before.length < roundsBeforeFinal) return []
    const shows = [...before.slice(-roundsBeforeFinal), final]
    return tournament.divisions.filter(division => (
      tournamentRoster(tournament.promotion, division, shows[0]).length >= tournamentSize(tournament.format)
    )).map(division => ({
      ...tournament, division, shows, editionId: tournament.id + '@' + year + '/' + division,
    }))
  }).sort((a, b) => a.shows[0].date.localeCompare(b.shows[0].date))
  seasons.set(year, editions)
  return editions
}

export function tournamentEdition(editionId: string): TournamentEdition | undefined {
  const year = Number(editionId.match(/@(\d{4})\//)?.[1])
  return Number.isInteger(year) ? editionsForSeason(year).find(edition => edition.editionId === editionId) : undefined
}

export function tournamentSlots(show: Show) {
  return editionsForSeason(seasonOf(show.date)).flatMap(edition => {
    const round = edition.shows.findIndex(roundShow => roundShow.id === show.id)
    return round < 0 ? [] : [{ edition, round }]
  })
}

export function roundName(edition: TournamentEdition, round: number) {
  if (round === edition.shows.length - 1) return 'Final'
  if (edition.format === 'knockout') return 'Semifinal ' + (round + 1)
  return edition.groups[round % 2] + ' · Rodada ' + (Math.floor(round / 2) + 1)
}
