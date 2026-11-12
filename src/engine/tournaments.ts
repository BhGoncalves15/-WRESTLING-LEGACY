import {
  roundName, tournamentEdition, tournamentRoster, tournamentSize, tournamentSlots, type TournamentEdition,
} from '../content/tournaments'
import type { Career, MatchResult, Show, ShowReport } from '../domain/model'
import { rankingsFor } from './rankings'
import { CAREER_FIGHTER_ID } from './titles'

type Pair = readonly [string, string]
type TournamentField = Career['tournamentFields'][number]
type Reports = ReadonlyMap<string, ShowReport>
type GroupRow = { fighterId: string; wins: number; losses: number; points: number }

export type TournamentFixture = { edition: TournamentEdition; round: number; fighters: Pair }

export function tournamentEntryIssue(career: Career, edition: TournamentEdition): string | undefined {
  const { contract } = career
  if (edition.shows[0].date <= career.worldThrough) return 'A janela de inscrição terminou.'
  if (contract?.status !== 'active' || contract.promotion !== edition.promotion || career.profile.division !== edition.division) {
    return 'A inscrição exige contrato ativo neste circuito e a mesma divisão.'
  }
  if (contract.end <= edition.shows.at(-1)!.date) return 'Seu contrato precisa cobrir a data da final.'
  return undefined
}

export function setTournamentEntry(career: Career, editionId: string, registered: boolean): Career {
  const edition = tournamentEdition(editionId)
  if (!edition) throw new Error('Esta edição não está no calendário.')
  const issue = tournamentEntryIssue(career, edition)
  if (issue) throw new Error(issue)
  const entries = career.tournamentEntries.filter(id => id !== editionId)
  return { ...career, tournamentEntries: registered ? [...entries, editionId] : entries }
}

function groupLineups(seeds: readonly string[]): readonly [readonly string[], readonly string[]] {
  return [[seeds[0], seeds[3], seeds[4]], [seeds[1], seeds[2], seeds[5]]]
}

export function groupTable(ids: readonly string[], results: readonly MatchResult[], winPoints: number): GroupRow[] {
  const played = results.filter(match => ids.includes(match.firstId) && ids.includes(match.secondId))
  const rows = ids.map(fighterId => {
    const wins = played.filter(match => match.winnerId === fighterId).length
    const losses = played.filter(match => match.winnerId !== fighterId && [match.firstId, match.secondId].includes(fighterId)).length
    return { fighterId, wins, losses, points: wins * winPoints }
  })
  // Resolve a tied set as a mini-table so a three-way tie has a consistent order.
  const headToHead = new Map(rows.map(row => [
    row.fighterId,
    played.filter(match => match.winnerId === row.fighterId && rows.some(other =>
      other.fighterId !== row.fighterId && other.points === row.points
      && [match.firstId, match.secondId].includes(other.fighterId),
    )).length,
  ]))
  return rows.sort((a, b) => b.points - a.points || headToHead.get(b.fighterId)! - headToHead.get(a.fighterId)!
    || ids.indexOf(a.fighterId) - ids.indexOf(b.fighterId))
}

function roundFighters(edition: TournamentEdition, seeds: readonly string[], round: number, results: readonly (MatchResult | undefined)[]): Pair | undefined {
  if (edition.format === 'knockout') {
    if (round < 2) return [seeds[round], seeds[3 - round]]
    return results[0] && results[1] ? [results[0].winnerId, results[1].winnerId] : undefined
  }
  const groups = groupLineups(seeds)
  if (round < 6) {
    const slots = [[0, 2], [0, 1], [1, 2]]
    const [first, second] = slots[Math.floor(round / 2)]
    const group = groups[round % 2]
    return [group[first], group[second]]
  }
  const completed = results.slice(0, 6).filter((result): result is MatchResult => Boolean(result))
  if (completed.length < 6) return undefined
  return [
    groupTable(groups[0], completed, edition.winPoints)[0].fighterId,
    groupTable(groups[1], completed, edition.winPoints)[0].fighterId,
  ]
}

export function tournamentProgress(edition: TournamentEdition, field: TournamentField | undefined, shows: Reports) {
  const results = edition.shows.map(show => shows.get(show.id)?.matches.find(match => match.tournamentId === edition.editionId))
  const rounds = edition.shows.map((show, round) => ({
    show, name: roundName(edition, round), result: results[round],
    fighters: field ? roundFighters(edition, field.seeds, round, results) : undefined,
  }))
  const leagueResults = results.slice(0, 6).filter((result): result is MatchResult => Boolean(result))
  return {
    rounds, winnerId: results.at(-1)?.winnerId,
    groups: edition.format === 'groups' && field
      ? groupLineups(field.seeds).map((ids, index) => ({ name: edition.groups[index], rows: groupTable(ids, leagueResults, edition.winPoints) }))
      : [],
  }
}

export function planTournaments(career: Career, shows: readonly Show[]) {
  const slots = shows.flatMap(tournamentSlots)
  if (!slots.length) return { fields: career.tournamentFields, entries: career.tournamentEntries, fixtures: new Map<string, TournamentFixture[]>() }
  const fields = [...career.tournamentFields]
  const entries = new Set(career.tournamentEntries)
  const reports = new Map(career.shows.map(report => [report.id, report]))
  const fixtures = new Map<string, TournamentFixture[]>()
  for (const { edition, round } of slots) {
    const show = edition.shows[round]
    let field = fields.find(item => item.editionId === edition.editionId)
    if (round === 0 && !field) {
      const registered = entries.delete(edition.editionId)
      const size = tournamentSize(edition.format)
      const pool = new Set(tournamentRoster(edition.promotion, edition.division, show).map(fighter => fighter.id))
      const order = rankingsFor(career, edition.promotion, edition.division, show.date).map(row => row.fighterId)
      const entrants = order.filter(id => pool.has(id)).slice(0, size - Number(registered))
      if (registered) entrants.push(CAREER_FIGHTER_ID)
      field = { editionId: edition.editionId, seeds: order.filter(id => entrants.includes(id)) }
      fields.push(field)
    }
    if (!field) continue
    const fighters = tournamentProgress(edition, field, reports).rounds[round].fighters
    if (!fighters) throw new Error('A rodada anterior do torneio precisa ser encerrada.')
    const card = fixtures.get(show.id) ?? []
    card.push({ edition, round, fighters })
    fixtures.set(show.id, card)
  }
  return { fields, entries: [...entries], fixtures }
}

export function validateTournaments(career: Career) {
  const { tournamentEntries, tournamentFields } = career
  const error = () => new Error('Os participantes ou as rodadas dos torneios estão inconsistentes.')
  const fields = new Map(tournamentFields.map(field => [field.editionId, field]))
  if (fields.size !== tournamentFields.length || new Set(tournamentEntries).size !== tournamentEntries.length) throw error()
  for (const id of tournamentEntries) {
    const edition = tournamentEdition(id)
    if (!edition || fields.has(id) || tournamentEntryIssue(career, edition)) throw error()
  }
  const shows = new Map(career.shows.map(show => [show.id, show]))
  const resultIds = new Set(career.shows.flatMap(show => show.matches.filter(match => match.tournamentId).map(match => match.id)))
  const live = career.bout && !career.bout.finish && career.bout.tournamentId ? career.bout : undefined
  let validLive = !live
  for (const field of fields.values()) {
    const edition = tournamentEdition(field.editionId)
    if (!edition || edition.shows[0].date > career.worldThrough || field.seeds.length !== tournamentSize(edition.format)
      || new Set(field.seeds).size !== field.seeds.length) throw error()
    const pool = tournamentRoster(edition.promotion, edition.division, edition.shows[0])
    if (field.seeds.some(id => id === CAREER_FIGHTER_ID ? career.profile.division !== edition.division : !pool.some(fighter => fighter.id === id))) throw error()
    for (const { show, result, fighters } of tournamentProgress(edition, field, shows).rounds) {
      if (show.date > career.worldThrough) break
      const open = live?.showId === show.id && live.tournamentId === edition.editionId ? live : undefined
      if (!fighters || Boolean(result) === Boolean(open)) throw error()
      const participants = result ? [result.firstId, result.secondId] : [CAREER_FIGHTER_ID, open!.rivalId]
      if (participants.some(id => !fighters.includes(id)) || (result && (result.tag || result.titleId))
        || (open && (open.tag || open.titleId || career.contract?.promotion !== edition.promotion))) throw error()
      if (result) resultIds.delete(result.id)
      else validLive = true
    }
  }
  if (resultIds.size || !validLive) throw error()
}
