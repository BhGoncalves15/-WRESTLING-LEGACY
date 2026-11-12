import { describe, expect, it } from 'vitest'
import { OPENING_TITLES, nextShows } from '../src/content/catalog'
import { defenseSize } from '../src/content/titles'
import type { Career, TagBout } from '../src/domain/model'
import { PLAYER_ID, advanceCareer, exampleProfile, newCareer, recordFor, resolvePlayerTurn, setCareerTeam, setMatchPreference, signOffer } from '../src/engine/career'
import { matchTeams, matchWinners } from '../src/engine/matches'
import { benchSlots, isTagBout, legalFighterId } from '../src/engine/tag-combat'
import { teamRecordFor } from '../src/engine/tag-teams'
import { applyTitleMatch, titleEligible, titleStates } from '../src/engine/titles'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'
import { careerWithOffer } from './fixtures'

const PARTNERS = ['jon-moxley', 'wheeler-yuta'] as const

function aewCareer() {
  const career = careerWithOffer('aew')
  return signOffer(career, career.offers.find(offer => offer.promotion === 'aew')!.id)
}

function trioBout(career: Career): TagBout {
  if (!career.bout || !isTagBout(career.bout) || career.bout.tag.player.partners.length !== 2) {
    throw new Error('O save precisa estar em uma luta de trios.')
  }
  return career.bout
}

function openTrio() {
  return advanceCareer(setCareerTeam(aewCareer(), 'trios', PARTNERS))
}

function actionAgainstGuard(career: Career, action: string) {
  return resolvePlayerTurn({ ...career, bout: { ...trioBout(career), plan: 'guard' } }, action)
}

function atPinfall(career: Career): Career {
  const bout = career.bout!
  const tag = bout.tag
  const rival = { ...bout.rival, condition: 0, position: 'grounded' as const }
  if (!tag) return { ...career, bout: { ...bout, rival, plan: 'guard' } }
  const [first, second] = tag.rival.partners
  const withoutStamina = (member: typeof first) => ({ ...member, side: { ...member.side, stamina: 0 } })
  const reserves: TagBout['tag']['rival']['partners'] = second
    ? [withoutStamina(first), withoutStamina(second)] : [withoutStamina(first)]
  return { ...career, bout: { ...bout, rival, plan: 'guard', tag: { ...tag, rival: { ...tag.rival, partners: reserves } } } }
}

describe('Trios', () => {
  it('mantém dupla e trio independentes e alterna o formato dos cards', () => {
    const signed = aewCareer()
    expect(() => setCareerTeam(signed, 'trios', [PARTNERS[0], PARTNERS[0]])).toThrow(/diferentes/)
    expect(() => setCareerTeam(signed, 'trios', ['samoa-joe', PARTNERS[1]])).toThrow(/disponíveis/)
    expect(() => setCareerTeam(signed, 'trios', [PARTNERS[0], 'toni-storm'])).toThrow(/disponíveis/)
    expect(() => setMatchPreference(signed, 'trios')).toThrow(/Forme/)
    const duo = setCareerTeam(signed, 'tag', [PARTNERS[0]])
    const both = setCareerTeam(duo, 'trios', PARTNERS)
    expect(both.tagPartnerId).toBe(PARTNERS[0])
    expect(both.trioPartnerIds).toEqual(PARTNERS)
    expect(both.preferredFormat).toBe('trios')
    expect(trioBout(advanceCareer(both)).tag.player.partners.map(member => member.id)).toEqual(PARTNERS)
    expect(advanceCareer(setMatchPreference(both, 'tag')).bout?.tag?.player.partners).toHaveLength(1)
    expect(advanceCareer(setMatchPreference(both, 'singles')).bout?.tag).toBeUndefined()
    const ended = setCareerTeam(both, 'trios', null)
    expect(ended.tagPartnerId).toBe(PARTNERS[0])
    expect(ended.preferredFormat).toBe('tag')
    expect(validateCareer(ended)).toEqual(ended)
  })

  it('troca para qualquer reserva, salva as seis condições e só aceita golpes do lutador legal', () => {
    const fight = openTrio()
    const bout = trioBout(fight)
    expect(benchSlots(bout, 'player')).toEqual([1, 2])
    expect(benchSlots(bout, 'rival')).toEqual([1, 2])
    expect(() => actionAgainstGuard(fight, 'tag-0')).toThrow(/apron/)
    const first = actionAgainstGuard(fight, 'tag-1')
    const second = actionAgainstGuard(fight, 'tag-2')
    expect(legalFighterId(trioBout(first), 'player', PLAYER_ID)).toBe(PARTNERS[0])
    expect(legalFighterId(trioBout(second), 'player', PLAYER_ID)).toBe(PARTNERS[1])
    expect(trioBout(second).tag.player.partners[0].side).toEqual(bout.tag.player.partners[0].side)
    expect(benchSlots(trioBout(second), 'player')).toEqual([0, 1])
    expect(() => resolvePlayerTurn(second, 'dropkick')).toThrow(/parceiro está no ringue/)
    expect(() => resolvePlayerTurn(second, 'ask-tag')).toThrow(/dois turnos/)
    const loaded = importCareer(exportCareer(second))
    expect(loaded.bout).toEqual(second.bout)
    let finished = loaded
    for (let turn = 0; turn < 16 && !finished.bout?.finish; turn++) {
      finished = resolvePlayerTurn(atPinfall(finished), 'watch')
    }
    const result = finished.shows.flatMap(show => show.matches).find(match => match.player)!
    expect(result.winnerId).toBe(PARTNERS[1])
    expect(matchWinners(result)).toEqual([PLAYER_ID, ...PARTNERS])
    expect(teamRecordFor(finished, [...PARTNERS].reverse()).wins).toBe(1)
    expect(recordFor(finished, PLAYER_ID).wins).toBe(1)
    expect(finished.ledger).toHaveLength(1)
    expect(validateCareer(finished)).toEqual(finished)
  })

  it('permite que o segundo reserva salve o parceiro e consome um salvamento para todo o trio', () => {
    const apron = actionAgainstGuard(openTrio(), 'tag-2')
    const bout = trioBout(apron)
    const [first, second] = bout.tag.player.partners
    if (!second) throw new Error('O trio precisa de dois parceiros.')
    const danger: TagBout = {
      ...bout, plan: 'pin', rival: { ...bout.rival, stamina: 100, position: 'standing' },
      tag: { ...bout.tag, player: {
        ...bout.tag.player, partners: [first, { ...second, side: { ...second.side, condition: 0, position: 'grounded' } }],
      } },
    }
    const saved = resolvePlayerTurn({ ...apron, bout: danger }, 'watch')
    expect(trioBout(saved).finish).toBeNull()
    expect(trioBout(saved).tag.player.saveUsed).toBe(true)
    expect(trioBout(saved).log.some(item => item.text === 'Jon Moxley interrompeu a contagem.')).toBe(true)
    expect(() => resolvePlayerTurn(saved, 'save-partner')).toThrow(/já usou/)
    expect(validateCareer(saved)).toEqual(saved)
  })

  it('conquista e defende o título de trios mesmo com preferência por Singles', () => {
    const signed = aewCareer()
    const duo = setCareerTeam(signed, 'tag', [PARTNERS[0]])
    let contender = advanceCareer(setCareerTeam(duo, 'trios', PARTNERS))
    for (let show = 0; show < 18 && !contender.bout?.titleId; show++) {
      contender = advanceCareer(resolvePlayerTurn(atPinfall(contender), 'pin'))
    }
    expect(trioBout(contender).titleId).toBe('aew-trios')
    const winner = resolvePlayerTurn(atPinfall(contender), 'pin')
    const title = titleStates(winner).get('aew-trios')
    expect(title?.holders).toEqual([PLAYER_ID, ...PARTNERS])
    expect(titleStates(importCareer(exportCareer(winner))).get('aew-trios')).toEqual(title)
    let defense = advanceCareer(setMatchPreference(winner, 'singles'))
    for (let show = 0; show < 18 && defense.bout?.titleId !== 'aew-trios'; show++) {
      defense = advanceCareer(resolvePlayerTurn(atPinfall(defense), 'pin'))
    }
    expect(trioBout(defense).titleId).toBe('aew-trios')
    const retained = resolvePlayerTurn(atPinfall(defense), 'pin')
    expect(titleStates(retained).get('aew-trios')?.defenses).toBe(1)
    const ended = setCareerTeam(retained, 'trios', null)
    expect(titleStates(ended).get('aew-trios')?.events.at(-1)).toMatchObject({ kind: 'vacancy', from: [PLAYER_ID, ...PARTNERS], to: null })
    expect(ended.tagPartnerId).toBe(PARTNERS[0])
    expect(validateCareer(ended)).toEqual(ended)
  })

  it('simula os quatro cinturões e rejeita um resultado com tamanho diferente', () => {
    let career = newCareer(exampleProfile(), 'normal', { seed: 4402 })
    const titles = OPENING_TITLES.filter(title => defenseSize(title) === 3)
    expect(titles.map(title => title.id)).toEqual(['aew-trios', 'njpw-never-six', 'aaa-trios', 'roh-six'])
    for (const title of titles) {
      expect(new Set(title.holderTeam).size).toBe(3)
      expect(title.holderTeam?.every(id => titleEligible(career, title, id))).toBe(true)
    }
    while (career.date < '2026-07-01') career = advanceCareer(career)
    const results = career.shows.flatMap(show => show.matches.filter(match => match.titleId && match.tag?.firstPartners.length === 2))
    expect(new Set(results.map(match => match.titleId))).toEqual(new Set(titles.map(title => title.id)))
    expect(results.every(match => new Set(matchTeams(match).flat()).size === 6)).toBe(true)
    expect(validateCareer(career)).toEqual(career)
    const fake = {
      id: 'fake', firstId: 'samoa-joe', secondId: 'jon-moxley', winnerId: 'samoa-joe',
      method: 'pinfall' as const, rounds: 10, player: false, titleId: 'aew-trios',
      tag: { firstPartners: ['katsuyori-shibata'], secondPartners: ['claudio-castagnoli'] },
    }
    expect(() => applyTitleMatch(titleStates(aewCareer()), career, nextShows('aew', '2026-01-01', 1)[0], fake)).toThrow(/disputa/)
  })
})
