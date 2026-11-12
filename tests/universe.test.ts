import { describe, expect, it } from 'vitest'
import {
  ANNOUNCED_SHOWS, ARCHIVE_2026, OPENING_TITLES, ORGANIZATIONS, ROSTER, ROSTER_BY_ID, TITLES_BY_ID,
  nextShowForCareer, nextShows, rosterFor, showPromotions, wrestlerAppearsIn,
} from '../src/content/catalog'
import { supportsDefense } from '../src/content/titles'
import { COMPANIES, LEGACY_DATA_VERSION, PROMOTIONS, SAVE_VERSION, type Career, type PromotionId } from '../src/domain/model'
import { PLAYER_ID, advanceCareer, exampleProfile, hasLiveBout, newCareer, resolvePlayerTurn, signOffer } from '../src/engine/career'
import { titleStates } from '../src/engine/titles'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'

import { careerWithOffer, duelBoutFor } from './fixtures'

function sign(career: Career, promotion: PromotionId) {
  return signOffer(career, career.offers.find(offer => offer.promotion === promotion)!.id)
}

function finishForPlayer(career: Career) {
  const bout = duelBoutFor(career)
  return resolvePlayerTurn({
    ...career, bout: {
      ...bout, plan: 'guard',
      player: { ...bout.player, position: 'standing', stamina: 100 },
      rival: { ...bout.rival, condition: 0, position: 'grounded' },
    },
  }, 'pin')
}

describe('universo de janeiro de 2026', () => {
  it('mantém 71 cinturões canônicos e as sete empresas do documento', () => {
    expect(PROMOTIONS).toHaveLength(9)
    expect(new Set(PROMOTIONS.map(id => ORGANIZATIONS[id].company))).toEqual(new Set(COMPANIES))
    expect(OPENING_TITLES).toHaveLength(71)
    expect(TITLES_BY_ID.size).toBe(71)
    const cruiser = TITLES_BY_ID.get('aaa-cruiser')!
    expect(cruiser.listings).toEqual(['aaa', 'raw', 'smackdown', 'nxt'])
    expect(cruiser.holder).toBe('Laredo Kid')
    expect(TITLES_BY_ID.get('tna-knockouts-tv')?.status).toBe('later')
    expect(TITLES_BY_ID.get('njpw-tamashii')?.status).toBe('later')
    expect(TITLES_BY_ID.get('bwf-rookies')?.vacant).toBe(true)
    expect(TITLES_BY_ID.get('bwf-brazil')?.holder).toBe('Adam Black')
    expect(OPENING_TITLES.filter(supportsDefense).every(title => ROSTER_BY_ID.has(title.holderId!))).toBe(true)
  })

  it('registra aparições cruzadas sem duplicar lutadores nem antecipar uma estreia de outubro', () => {
    expect(ROSTER_BY_ID.size).toBe(ROSTER.length)
    const dominik = ROSTER_BY_ID.get('dominik-mysterio')!
    expect(dominik.promotion).toBe('raw')
    expect(wrestlerAppearsIn(dominik, 'aaa')).toBe(true)
    expect(rosterFor('aaa').find(fighter => fighter.id === dominik.id)).toBe(dominik)
    const ilja = ROSTER_BY_ID.get('ilja-dragunov')!
    expect(ilja.promotion).toBe('smackdown')
    expect(wrestlerAppearsIn(ilja, 'aew')).toBe(false)
    expect(ARCHIVE_2026.some(show => show.name === 'AEW WrestleDream')).toBe(true)
    expect(nextShows('aew', '2026-10-16', 1)[0].origin).toBe('generated')
  })

  it('abre eventos compartilhados para Raw e SmackDown uma vez por data', () => {
    const rumble = ANNOUNCED_SHOWS.find(show => show.name === 'WWE Royal Rumble')!
    expect(showPromotions(rumble)).toEqual(['raw', 'smackdown'])
    expect(nextShowForCareer('smackdown', '2026-01-30')?.id).toBe(rumble.id)
    expect(nextShows('smackdown', '2026-01-30', 4).some(show => show.id === rumble.id)).toBe(false)
  })

  it.each(PROMOTIONS)('oferece contrato e uma estreia jogável em %s', promotion => {
    const first = careerWithOffer(promotion)
    expect(first.offers).toHaveLength(3)
    expect(new Set(first.offers.map(offer => ORGANIZATIONS[offer.promotion].company)).size).toBe(3)
    const career = advanceCareer(sign(first, promotion))
    const show = career.shows.find(report => report.id === career.bout?.showId)!
    expect(hasLiveBout(career)).toBe(true)
    expect(showPromotions(show)).toContain(promotion)
    expect(validateCareer(career)).toEqual(career)
  })

  it('processa defesas, trocas de campeão e cards das sete empresas no mesmo mundo', () => {
    let career = newCareer(exampleProfile(), 'normal', { seed: 73958 })
    while (career.date < '2026-07-01') career = advanceCareer(career)
    const titleReports = career.shows.filter(show => show.matches.some(match => match.titleId))
    expect(new Set(titleReports.map(show => ORGANIZATIONS[show.promotion].company))).toEqual(new Set(COMPANIES))
    const states = [...titleStates(career).values()]
    expect(states.some(state => state.events.some(event => event.kind === 'change'))).toBe(true)
    expect(states.some(state => state.events.some(event => event.kind === 'defense'))).toBe(true)
    expect(validateCareer(career)).toEqual(career)
  })

  it('premia a vitória em uma disputa do jogador e preserva o reinado ao exportar', () => {
    let career = advanceCareer(sign(careerWithOffer('nxt'), 'nxt'))
    for (let attempt = 0; attempt < 12 && !career.bout?.titleId; attempt++) {
      if (!hasLiveBout(career)) throw new Error('A carreira deveria ter uma luta disponível')
      career = advanceCareer(finishForPlayer(career))
    }
    const titleId = career.bout?.titleId
    expect(titleId).toBeTruthy()
    const finished = finishForPlayer(career)
    const state = titleStates(finished).get(titleId!)
    expect(state?.holders).toEqual([PLAYER_ID])
    expect(state?.events.at(-1)?.kind).toBe('change')
    expect(finished.history.some(item => item.kind === 'title' && item.title.includes('BH conquistou'))).toBe(true)
    expect(titleStates(importCareer(exportCareer(finished))).get(titleId!)).toEqual(state)
  })

  it('atualiza saves v1 sem reescrever shows anteriores ou o turno em andamento', () => {
    const started = advanceCareer(sign(careerWithOffer('nxt'), 'nxt'))
    const turned = resolvePlayerTurn(started, 'guard')
    const { expandedOn: _expandedOn, vacatedTitles: _vacatedTitles, tagPartnerId: _tagPartnerId, ...fields } = turned
    const old = {
      ...fields,
      schemaVersion: 1,
      dataVersion: LEGACY_DATA_VERSION,
      shows: turned.shows.filter(show => ['nxt', 'tna', 'roh'].includes(show.promotion))
        .map(show => ({ ...show, matches: show.matches.filter(match => !match.tag).map(({ titleId: _titleId, ...match }) => match) })),
      history: turned.history.filter(item => item.kind !== 'title').map((item, index) => ({ ...item, id: 'event-' + index })),
    }
    const upgraded = importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 1, career: old }))
    expect(upgraded.schemaVersion).toBe(SAVE_VERSION)
    expect(upgraded.expandedOn).toBe(old.date)
    expect(upgraded.shows).toEqual(old.shows)
    expect(upgraded.bout).toEqual(old.bout)
    const next = advanceCareer(finishForPlayer(upgraded))
    expect(next.shows.some(show => show.promotion === 'aew')).toBe(true)
    expect(validateCareer(next)).toEqual(next)
  })
})
