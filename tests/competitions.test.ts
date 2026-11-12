import { describe, expect, it } from 'vitest'
import { nextShows } from '../src/content/catalog'
import { editionsForSeason, tournamentEdition } from '../src/content/tournaments'
import { PROMOTIONS, SAVE_VERSION, TEAM_TITLES_DATA_VERSION, addDays, type Career, type MatchResult } from '../src/domain/model'
import { PLAYER_ID, advanceCareer, exampleProfile, hasLiveBout, newCareer, resolvePlayerTurn, setCareerTeam } from '../src/engine/career'
import { RANKING_DAYS, rankingsFor } from '../src/engine/rankings'
import { matchRivalry, rematchReady, trackRivalry, type RivalryStates } from '../src/engine/rivalries'
import { groupTable, setTournamentEntry, tournamentEntryIssue, tournamentProgress } from '../src/engine/tournaments'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'
import { duelBoutFor, signedBefore } from './fixtures'

function resultsFor(career: Career, editionId: string) {
  const edition = tournamentEdition(editionId)!
  const field = career.tournamentFields.find(item => item.editionId === editionId)
  return tournamentProgress(edition, field, new Map(career.shows.map(show => [show.id, show])))
}

function finishByPinfall(career: Career): Career {
  const bout = duelBoutFor(career)
  const next = resolvePlayerTurn({
    ...career, bout: { ...bout, rival: { ...bout.rival, condition: 0, position: 'grounded' }, plan: 'guard' },
  }, 'pin')
  expect(duelBoutFor(next).finish?.winner).toBe('player')
  return next
}

function result(firstId: string, secondId: string, winnerId: string): MatchResult {
  return { id: firstId + '/' + secondId, firstId, secondId, winnerId, player: false, method: 'pinfall', rounds: 10 }
}

describe('competições da Carreira Livre', () => {
  it('simula as edições de todos os circuitos com vencedores, resultados e notícias', () => {
    let career = newCareer(exampleProfile(), 'normal', { seed: 1110 })
    while (career.date < '2027-01-01') career = advanceCareer(career)
    const editions = editionsForSeason(2026)
    expect(new Set(editions.map(edition => edition.promotion))).toEqual(new Set(PROMOTIONS))
    expect(career.tournamentFields).toHaveLength(editions.length)
    expect(career.history.some(item => item.kind === 'rivalry' && item.title.includes('venceu a rivalidade'))).toBe(true)
    for (const edition of editions) {
      const progress = resultsFor(career, edition.editionId)
      expect(progress.rounds.every(round => round.result && !round.result.player)).toBe(true)
      expect(progress.rounds).toHaveLength(edition.format === 'groups' ? 7 : 3)
      expect(progress.winnerId).toBeTruthy()
      const finalists = progress.rounds.at(-1)?.fighters
      if (edition.format === 'groups') {
        expect(progress.groups.every(group => group.rows.every(row => row.wins + row.losses === 2))).toBe(true)
        expect(finalists).toEqual(progress.groups.map(group => group.rows[0].fighterId))
      } else expect(finalists).toEqual(progress.rounds.slice(0, 2).map(round => round.result?.winnerId))
    }
    expect(validateCareer(career)).toEqual(career)
    expect(importCareer(exportCareer(career)).tournamentFields).toEqual(career.tournamentFields)
  })

  it('inscreve BH, restaura a semifinal e classifica o vencedor pela luta jogada', () => {
    const edition = tournamentEdition('nxt-cup@2026/men')!
    const signed = signedBefore('nxt', edition.shows[0].date)
    const shortContract = { ...signed, contract: { ...signed.contract!, end: edition.shows.at(-1)!.date } }
    expect(tournamentEntryIssue(shortContract, edition)).toMatch(/cobrir/)
    expect(() => setTournamentEntry(signed, 'nxt-cup@2026/women', true)).toThrow(/divisão/)
    const entered = setTournamentEntry(signed, edition.editionId, true)
    expect(setTournamentEntry(entered, edition.editionId, false).tournamentEntries).toEqual([])
    const debut = advanceCareer(entered)
    expect(debut.bout?.tournamentId).toBe(edition.editionId)
    expect(debut.tournamentEntries).toEqual([])
    expect(() => setTournamentEntry(debut, edition.editionId, false)).toThrow(/janela/)
    expect(() => validateCareer({ ...debut, bout: { ...debut.bout!, tournamentId: undefined } })).toThrow(/torneios/)
    const first = resolvePlayerTurn(debut, 'dropkick')
    const restored = importCareer(exportCareer(first))
    expect(restored.bout).toEqual(first.bout)
    let career = finishByPinfall(restored)
    const bh = rankingsFor(career, 'nxt', 'men').find(row => row.fighterId === PLAYER_ID)
    expect(bh).toMatchObject({ wins: 1, points: 5 })
    expect(rankingsFor(career, 'nxt', 'men', addDays(career.date, RANKING_DAYS)).find(row => row.fighterId === PLAYER_ID)?.position).toBeNull()
    while (career.date < edition.shows.at(-1)!.date) {
      career = advanceCareer(career)
      if (hasLiveBout(career)) career = finishByPinfall(career)
    }
    expect(resultsFor(career, edition.editionId).winnerId).toBe(PLAYER_ID)
    expect(career.history.some(item => item.kind === 'tournament' && item.title === 'BH conquistou ' + edition.name)).toBe(true)
    expect(validateCareer(career)).toEqual(career)
  })

  it.each([['tag', ['acce']], ['trios', ['acce', 'adam-black']]] as const)(
    'mantém os parceiros disponíveis para %s quando a BWF abre a copa',
    (format, partners) => {
      const edition = tournamentEdition('bwf-cup@2026/men')!
      const signed = signedBefore('bwf', edition.shows[0].date)
      const career = advanceCareer(setCareerTeam(signed, format, partners))
      expect(career.bout?.tag?.player.partners.map(member => member.id)).toEqual(partners)
      const field = career.tournamentFields.find(item => item.editionId === edition.editionId)!
      expect(partners.every(id => !field.seeds.includes(id))).toBe(true)
      expect(resultsFor(career, edition.editionId).rounds[0].result).toBeDefined()
      expect(validateCareer(career)).toEqual(career)
    },
  )

  it('deixa BH jogar as duas rodadas de grupo e a final do Continental Classic', () => {
    const edition = tournamentEdition('continental-classic@2026/men')!
    const signed = signedBefore('aew', edition.shows[0].date)
    let career = setTournamentEntry(signed, edition.editionId, true)
    while (career.date < edition.shows.at(-1)!.date) {
      career = advanceCareer(career)
      if (hasLiveBout(career)) career = finishByPinfall(career)
    }
    const progress = resultsFor(career, edition.editionId)
    expect(progress.rounds.filter(round => round.result?.player)).toHaveLength(3)
    expect(progress.groups.flatMap(group => group.rows).find(row => row.fighterId === PLAYER_ID))
      .toEqual({ fighterId: PLAYER_ID, wins: 2, losses: 0, points: 6 })
    expect(progress.winnerId).toBe(PLAYER_ID)
    expect(validateCareer(career)).toEqual(career)
    const invalid = { ...career, tournamentFields: career.tournamentFields.map(field => field.editionId !== edition.editionId
      ? field : { ...field, seeds: field.seeds.map(() => PLAYER_ID) }) }
    expect(() => validateCareer(invalid)).toThrow(/torneios/)
  })

  it('usa confronto direto e ordem de entrada no desempate', () => {
    const entrants = ['a', 'b', 'c']
    expect(groupTable(entrants, [result('a', 'b', 'b'), result('a', 'c', 'a')], 2).map(row => row.fighterId)).toEqual(['b', 'a', 'c'])
    const cycle = [result('a', 'b', 'b'), result('a', 'c', 'a'), result('b', 'c', 'c')]
    expect(groupTable(entrants, cycle, 3)).toEqual(entrants.map(fighterId => ({ fighterId, wins: 1, losses: 1, points: 3 })))
  })

  it('abre uma rivalidade após a revanche, resolve a série e aplica o intervalo', () => {
    const rivalries: RivalryStates = new Map()
    const shows = nextShows('nxt', '2026-01-06', 3)
    const first = 'ethan-page'
    const second = 'ricky-saints'
    expect(trackRivalry(rivalries, shows[0], result(first, second, first))).toBeUndefined()
    const rivalry = matchRivalry(rivalries, shows[0], first, second)!
    expect(rematchReady(rivalry, shows[0].date)).toBe(false)
    expect(rematchReady(rivalry, shows[1].date)).toBe(true)
    expect(trackRivalry(rivalries, shows[1], result(first, second, second))).toMatchObject({ kind: 'started' })
    expect(trackRivalry(rivalries, shows[2], result(first, second, first))).toMatchObject({ kind: 'resolved', rivalry: { winnerId: first, wins: [2, 1] } })
    expect(rematchReady(matchRivalry(rivalries, shows[2], first, second)!, addDays(shows[2].date, 7))).toBe(false)
    expect(trackRivalry(rivalries, { ...shows[2], date: addDays(shows[2].date, 7) }, result(first, second, second))).toBeUndefined()
  })

  it('carrega a versão 5 com a luta ativa e abre as inscrições a partir da data do save', () => {
    const edition = tournamentEdition('nxt-cup@2026/men')!
    const signed = signedBefore('nxt', '2026-01-06')
    const current = resolvePlayerTurn(advanceCareer(signed), 'dropkick')
    const { tournamentEntries: _entries, tournamentFields: _fields, ...fields } = current
    const legacy = { ...fields, schemaVersion: 5, dataVersion: TEAM_TITLES_DATA_VERSION }
    const upgraded = importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 5, career: legacy }))
    expect(upgraded.schemaVersion).toBe(SAVE_VERSION)
    expect(upgraded.bout).toEqual(current.bout)
    expect(upgraded.shows).toEqual(current.shows)
    expect(upgraded.tournamentFields).toEqual([])
    expect(setTournamentEntry(upgraded, edition.editionId, true).tournamentEntries).toEqual([edition.editionId])
  })
})
