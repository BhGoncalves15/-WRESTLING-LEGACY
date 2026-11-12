import { describe, expect, it } from 'vitest'
import { ROSTER_BY_ID } from '../src/content/catalog'
import { tournamentEdition } from '../src/content/tournaments'
import { COMPETITIONS_DATA_VERSION, MULTI_SIZE, SAVE_VERSION, type Career, type MultiFormat } from '../src/domain/model'
import { PLAYER_ID, advanceCareer, balanceFor, recordFor, resolvePlayerTurn, setFightTarget, setMatchPreference } from '../src/engine/career'
import { matchFormat, matchTeams, matchWinners } from '../src/engine/matches'
import { rankingsFor } from '../src/engine/rankings'
import { titleStates } from '../src/engine/titles'
import { setTournamentEntry } from '../src/engine/tournaments'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'
import { multiBoutFor, pauseForRivalFall, signedBefore } from './fixtures'

const start = (format: MultiFormat) => advanceCareer(setMatchPreference(signedBefore('nxt', '2026-01-01'), format))

function finishMatch(career: Career, action: 'pin' | 'submit', defeatedId = multiBoutFor(career).multi.targetId) {
  const bout = multiBoutFor(career)
  const opponents = bout.multi.opponents.map(entry => ({ ...entry, action: 'guard', side: {
    ...entry.side, condition: 0, position: 'grounded' as const,
  } }))
  return resolvePlayerTurn({
    ...career, bout: { ...bout, multi: { ...bout.multi, targetId: defeatedId, opponents } },
  }, action)
}

describe('Triple Threat e Fatal 4-Way', () => {
  it.each(['triple-threat', 'fatal-4-way'] as const)('escala %s com a divisão correta e restaura o alvo sem avançar o turno', format => {
    const signed = signedBefore('nxt', '2026-01-01', 'women')
    const booked = advanceCareer(setMatchPreference(signed, format))
    const bout = multiBoutFor(booked)
    const ids = bout.multi.opponents.map(opponent => opponent.id)
    expect(new Set(ids).size).toBe(MULTI_SIZE[format] - 1)
    expect(ids.every(id => ROSTER_BY_ID.get(id)?.division === 'women')).toBe(true)
    expect(() => setFightTarget(booked, PLAYER_ID)).toThrow(/adversário/)
    const targeted = setFightTarget(booked, ids.at(-1)!)
    expect(targeted.bout?.turn).toBe(0)
    expect(targeted.rng).toBe(booked.rng)
    expect(bout.multi.targetId).toBe(ids[0])
    const restored = importCareer(exportCareer(targeted))
    expect(restored.bout).toEqual(targeted.bout)
    const result = resolvePlayerTurn(restored, 'dropkick')
    expect(result.bout?.turn).toBe(1)
    expect(result.bout?.log.some(entry => entry.actor === 'player' && entry.text.includes(ROSTER_BY_ID.get(ids.at(-1)!)!.name))).toBe(true)
    expect(validateCareer(result)).toEqual(result)
  })

  it('pausa uma contagem entre adversários e retoma a luta após a interrupção', () => {
    const pending = pauseForRivalFall(start('triple-threat'))
    const bout = multiBoutFor(pending)
    expect(bout.turn).toBe(1)
    expect(bout.multi.pendingFall?.winnerId).toBe(bout.multi.opponents[0].id)
    expect(bout.finish).toBeNull()
    expect(pending.ledger).toHaveLength(0)
    expect(() => advanceCareer(pending)).toThrow(/andamento/)
    expect(() => resolvePlayerTurn(pending, 'dropkick')).toThrow(/tentativa/)
    const resumed = importCareer(exportCareer(pending))
    const saved = resolvePlayerTurn(resumed, 'break-up')
    expect(saved.bout?.turn).toBe(bout.turn)
    expect(saved.bout?.player.stamina).toBeLessThan(bout.player.stamina)
    expect(saved.bout?.multi?.pendingFall).toBeNull()
    expect(saved.bout?.multi?.opponents[0].side.position).toBe('grounded')
    expect(saved.bout?.log.at(-1)?.text).toContain('BH interrompeu a contagem')
    expect(validateCareer(saved)).toEqual(saved)
    expect(() => resolvePlayerTurn(saved, 'break-up')).toThrow()
  })

  it('registra a primeira submissão de um adversário e contabiliza os demais como derrotados', () => {
    const pending = pauseForRivalFall(start('fatal-4-way'), 'submission')
    const bout = multiBoutFor(pending)
    const fall = bout.multi.pendingFall!
    expect(fall.method).toBe('submission')
    expect(fall.defeatedId).not.toBe(PLAYER_ID)
    const finished = resolvePlayerTurn(pending, 'allow-fall')
    expect(finished.bout?.finish).toEqual(fall)
    const result = finished.shows.find(show => show.id === bout.showId)!.matches.find(match => match.player)!
    expect(matchFormat(result)).toBe('fatal-4-way')
    expect(matchWinners(result)).toEqual([fall.winnerId])
    expect(result.multi?.defeatedId).toBe(fall.defeatedId)
    for (const [id] of matchTeams(result)) {
      const record = recordFor(finished, id, true)
      expect(record).toMatchObject(id === fall.winnerId ? { wins: 1, losses: 0 } : { wins: 0, losses: 1 })
    }
    expect(balanceFor(finished)).toBe(finished.contract?.pay)
    expect(() => resolvePlayerTurn(finished, 'allow-fall')).toThrow()
    expect(validateCareer(finished)).toEqual(finished)
  })

  it('permite à IA quebrar o pinfall do jogador e decide quando ele está no chão', () => {
    const opened = start('triple-threat')
    const bout = multiBoutFor(opened)
    const opponents = bout.multi.opponents.map((entry, index) => ({
      ...entry, action: 'guard', side: index ? entry.side : { ...entry.side, condition: 0, position: 'grounded' as const },
    }))
    const broken = resolvePlayerTurn({ ...opened, rng: 1, bout: { ...bout, multi: { ...bout.multi, opponents } } }, 'pin')
    expect(broken.bout?.finish).toBeNull()
    expect(broken.bout?.player.position).toBe('grounded')
    expect(broken.bout?.log.at(-1)?.text).toContain('interrompeu a contagem de BH')
    const grounded: Career = { ...opened, bout: { ...bout, player: { ...bout.player, position: 'grounded' } } }
    const loss = pauseForRivalFall(grounded)
    expect(loss.bout?.multi?.pendingFall).toBeNull()
    expect(loss.bout?.finish).toMatchObject({ winnerId: bout.multi.opponents[0].id })
    expect(validateCareer(loss)).toEqual(loss)
  })

  it('usa vitórias individuais para habilitar o título e troca o campeão em uma queda entre desafiantes', () => {
    let career = start('fatal-4-way')
    for (let attempt = 0; attempt < 15 && !career.bout?.titleId; attempt++) {
      career = advanceCareer(finishMatch(career, 'pin'))
    }
    const titleId = multiBoutFor(career).titleId!
    const holder = titleStates(career).get(titleId)?.holders?.[0]
    expect(holder).toBeTruthy()
    expect(rankingsFor(career, 'nxt', 'men').find(row => row.fighterId === PLAYER_ID)?.wins).toBeGreaterThanOrEqual(3)
    const other = multiBoutFor(career).multi.opponents.find(entry => entry.id !== holder)!
    career = finishMatch(career, 'submit', other.id)
    expect(career.bout?.finish).toEqual({ winnerId: PLAYER_ID, defeatedId: other.id, method: 'submission' })
    expect(titleStates(career).get(titleId)?.holders).toEqual([PLAYER_ID])
    expect(validateCareer(career)).toEqual(career)

    career = advanceCareer(career)
    for (let attempt = 0; attempt < 15 && career.bout?.titleId !== titleId; attempt++) {
      career = advanceCareer(finishMatch(career, 'pin'))
    }
    expect(career.bout?.titleId).toBe(titleId)
    const defense = pauseForRivalFall(career)
    const fall = multiBoutFor(defense).multi.pendingFall!
    expect(fall).toBeTruthy()
    const loss = resolvePlayerTurn(importCareer(exportCareer(defense)), 'allow-fall')
    expect(titleStates(loss).get(titleId)?.holders).toEqual([fall.winnerId])
    expect(loss.bout?.finish).toEqual(fall)
    expect(validateCareer(loss)).toEqual(loss)
  })

  it('mantém o formato da semifinal quando o jogador prefere Fatal 4-Way', () => {
    const edition = tournamentEdition('nxt-cup@2026/men')!
    const signed = setMatchPreference(signedBefore('nxt', edition.shows[0].date), 'fatal-4-way')
    const booked = advanceCareer(setTournamentEntry(signed, edition.editionId, true))
    expect(booked.bout?.multi).toBeUndefined()
    expect(booked.bout?.tournamentId).toBe(edition.editionId)
    expect(validateCareer(booked)).toEqual(booked)
  })

  it('rejeita adversários repetidos, planos com alvo desconhecido e quedas incompatíveis com o card', () => {
    const pending = pauseForRivalFall(start('triple-threat'))
    const bout = multiBoutFor(pending)
    const [first, second] = bout.multi.opponents
    expect(() => validateCareer({ ...pending, bout: { ...bout, multi: { ...bout.multi, opponents: [first, first] } } })).toThrow(/calendário/)
    expect(() => validateCareer({
      ...pending, bout: { ...bout, multi: { ...bout.multi, opponents: [{ ...first, targetId: 'desconhecido' }, second] } },
    })).toThrow(/calendário/)
    expect(() => validateCareer({
      ...pending, bout: { ...bout, multi: { ...bout.multi, pendingFall: { ...bout.multi.pendingFall!, winnerId: PLAYER_ID } } },
    })).toThrow(/calendário/)
  })

  it('migra a versão 6 mantendo inscrições e a preferência original', () => {
    const edition = tournamentEdition('nxt-cup@2026/men')!
    const original = setTournamentEntry(signedBefore('nxt', '2026-01-01'), edition.editionId, true)
    const v6 = { ...original, schemaVersion: 6, dataVersion: COMPETITIONS_DATA_VERSION }
    const career = importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 6, career: v6 }))
    expect(career.schemaVersion).toBe(SAVE_VERSION)
    expect(career.preferredFormat).toBe('singles')
    expect(career.tournamentEntries).toEqual([edition.editionId])
  })
})
