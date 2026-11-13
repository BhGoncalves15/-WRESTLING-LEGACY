import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { beltArtworkFor, titleName, type BeltArtBrief } from '../src/content/belt-designs'
import { openingBeltPhoto, realBeltDesigns } from '../src/content/belt-photos'
import { OPENING_TITLES, ROSTER_BY_ID, TITLES_BY_ID } from '../src/content/catalog'
import { makePlace, type Country, type CountryPlaces } from '../src/content/geography'
import { MOVE_DESCRIPTIONS, MOVE_REFERENCES } from '../src/content/move-details'
import { MOVES, validMoveset } from '../src/content/moves'
import { defaultAppearance } from '../src/domain/appearance'
import { searchKey } from '../src/domain/geography'
import { MULTI_DATA_VERSION, SAVE_VERSION, START_DATE, ageOn } from '../src/domain/model'
import {
  advanceCareer, changeCareerMove, exampleProfile, hasLiveBout, improveMove, negotiate, newCareer,
  resolvePlayerTurn, signOffer, unlockMove, updateAppearance,
} from '../src/engine/career'
import { beltsDue, compatibleTitles, titleStates } from '../src/engine/titles'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'
import { careerWithOffer } from './fixtures'

describe('revisão da criação e do moveset', () => {
  it('aceita somente idades iniciais inteiras de 18 a 24 e envelhece ao virar o ano', () => {
    const profile = exampleProfile()
    for (const age of [17, 25, 23.5, NaN]) expect(() => newCareer({ ...profile, age }, 'normal')).toThrow(/18 e 24/)
    for (const age of [18, 24]) expect(newCareer({ ...profile, age }, 'normal').profile.age).toBe(age)
    expect(ageOn(24, '2026-12-31')).toBe(24)
    expect(ageOn(24, '2027-01-01')).toBe(25)
  })

  it('migra um save v7 com idade antiga, origem, traje e luta em andamento', () => {
    const opening = careerWithOffer('nxt')
    const active = advanceCareer(signOffer(opening, opening.offers.find(offer => offer.promotion === 'nxt')!.id))
    const { look: _look, ...profile } = active.profile
    const legacy = { ...active, profile: { ...profile, age: 34, gear: 'Jaqueta antiga', entrance: 'Entrada antiga' },
      schemaVersion: 7, dataVersion: MULTI_DATA_VERSION, titleChanges: undefined, titleProposal: undefined }
    const imported = importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 7, career: legacy }))
    expect(imported.schemaVersion).toBe(SAVE_VERSION)
    expect(imported.bout).toEqual(active.bout)
    expect(imported.profile).toMatchObject({ age: 34, gear: 'Jaqueta antiga', entrance: 'Entrada antiga' })
    expect(imported.titleChanges).toEqual([])
    const look = { ...defaultAppearance(), top: 'jacket', mask: 'lucha', bottom: 'board', heightCm: 220, primary: '#ef8627' } as const
    const updated = updateAppearance(imported, look)
    const roundTrip = importCareer(exportCareer(resolvePlayerTurn(updated, 'guard')))
    expect(roundTrip.profile.look).toEqual(look)
    expect(roundTrip.bout?.turn).toBe(1)
    expect(() => updateAppearance(updated, { ...look, heightCm: 221 })).toThrow()
  })

  it('vincula regiões e cidades a seus IDs no catálogo distribuído e permite registrar uma cidade ausente', () => {
    const data = (path: string) => readFileSync(new URL('../public/geography/' + path, import.meta.url))
    const index: Country[] = JSON.parse(data('countries.json').toString())
    expect(index).toHaveLength(250)
    const brazil = index.find(([code]) => code === 'BR')!
    const catalog: CountryPlaces = JSON.parse(gunzipSync(data('places-' + brazil[3] + '.json.gz')).toString()).BR
    expect(catalog[0]).toHaveLength(27)
    expect(makePlace('BR', catalog, 'BR:50', 'BR:50:5008305', '')).toEqual({
      countryCode: 'BR', regionId: 'BR:50', region: 'Mato Grosso do Sul', cityId: 'BR:50:5008305', city: 'Três Lagoas',
    })
    expect(() => makePlace('BR', catalog, 'BR:35', 'BR:50:5008305', '')).toThrow()
    expect(() => makePlace('BR', catalog, 'CA:50', '', 'Outra cidade')).toThrow()
    expect(makePlace('BR', catalog, 'BR:50', '', '  Outra cidade  ')).toMatchObject({ cityId: null, city: 'Outra cidade' })
    expect(searchKey('Três Lagoas')).toBe(searchKey('TRES LAGOAS'))
  })

  it('guarda XP, requisitos, especialização dos golpes e os 20 espaços após a troca', () => {
    const career = newCareer(exampleProfile(), 'normal')
    const prepared = { ...career, xp: 90, profile: { ...career.profile, attributes: { ...career.profile.attributes, strength: 65 } } }
    expect(() => unlockMove({ ...prepared, xp: 39 }, 'spear')).toThrow(/40 XP/)
    expect(() => unlockMove({ ...prepared, profile: career.profile }, 'spear')).toThrow(/Força/)
    expect(() => changeCareerMove(prepared, 'spear', 'cutter')).toThrow(/Aprenda/)
    let next = improveMove(prepared, 'cutter')
    next = unlockMove(next, 'spear')
    expect(() => unlockMove(next, 'spear')).toThrow(/disponível/)
    expect(() => changeCareerMove(next, 'spear', 'dropkick')).toThrow(/mesma categoria/)
    next = changeCareerMove(next, 'spear', 'cutter')
    expect(next.xp).toBe(32)
    expect(next.profile.moves).toHaveLength(20)
    expect(validMoveset([...next.profile.moves, 'inventado'])).toBe(false)
    const imported = importCareer(exportCareer(next))
    expect(imported.profile.unlockedMoves).toEqual(['spear'])
    expect(imported.profile.moveLevels.cutter).toBe(1)
    expect(changeCareerMove(imported, 'cutter', 'spear').profile.moveLevels.cutter).toBe(1)
  })

  it('inclui descrição e demonstração local única para cada golpe', () => {
    expect(new Set(MOVES.map(move => move.id)).size).toBe(MOVES.length)
    const signatures = new Set<string>()
    for (const move of MOVES) {
      expect(MOVE_DESCRIPTIONS[move.id]?.length).toBeGreaterThan(20)
      const video = readFileSync(new URL('../public/moves/' + move.id + '.mp4', import.meta.url))
      expect(video.subarray(4, 8).toString()).toBe('ftyp')
      signatures.add(video.toString('base64'))
    }
    expect(signatures.size).toBe(30)
    expect(MOVE_REFERENCES.cutter[0]).toMatchObject({ alias: 'RKO', fighter: 'Randy Orton' })
    expect(MOVE_REFERENCES.spear[0].fighter).toBe('Roman Reigns')
    expect(ROSTER_BY_ID.get('roman-reigns')?.moves).toContain('spear')
    expect(ROSTER_BY_ID.get('bron-breakker')?.moves).toContain('spear')
    expect(ROSTER_BY_ID.get('dominik-mysterio')?.moves).toContain('splash')
    expect(ROSTER_BY_ID.get('iyo-sky')?.moves).toContain('moonsault')
  })
})

describe('linhagens e versões de cinturão', () => {
  it('confere fotos locais, versões de abertura e fotografias apenas históricas', () => {
    const assets = OPENING_TITLES.flatMap(realBeltDesigns)
    expect(assets.length).toBeGreaterThan(8)
    expect(new Set(assets.map(asset => asset.id)).size).toBe(assets.length)
    for (const asset of assets) {
      const file = readFileSync(new URL('../public/belts/' + asset.id + '.webp', import.meta.url))
      expect(file.subarray(8, 12).toString()).toBe('WEBP')
      expect(asset.source).toMatch(/^https:\/\/commons\.wikimedia\.org/)
      expect(asset.licenseUrl).toMatch(/^https:\/\/creativecommons\.org/)
    }
    expect(openingBeltPhoto(TITLES_BY_ID.get('nxt-na')!)?.id).toBe('nxt-na-2018')
    expect(openingBeltPhoto(TITLES_BY_ID.get('nxt-men')!)).toBeUndefined()
  })

  it('gera arte reproduzível, varia as placas e reserva um motivo para a unificação', () => {
    const brief: BeltArtBrief = { title: 'Campeonato A', promotion: 'NXT', accent: '#cdefff', prestige: 73,
      lineage: ['A', 'B'], reason: 'unification', seed: '2027' }
    const first = beltArtworkFor(brief)
    expect(first).toEqual(beltArtworkFor(brief))
    expect(first.motif).toBe('interlocked')
    expect(first.sidePlates).toBe(4)
    const next = beltArtworkFor({ ...brief, reason: 'redesign', formerDesign: first })
    expect(next.plate).not.toBe(first.plate)
    expect(next.strap).not.toBe(first.strap)
  })

  it('simula três temporadas, preserva títulos incompatíveis e encerra os incorporados somente dali em diante', () => {
    let career = newCareer({ ...exampleProfile(), age: 24 }, 'normal', { seed: 73958 })
    const second = newCareer(exampleProfile(), 'normal', { seed: 44 })
    while (career.date < '2029-01-01') career = advanceCareer(career)
    expect(career.shows.length).toBe(1590)
    expect(career.tournamentFields.length).toBe(51)
    expect(ageOn(career.profile.age, career.date)).toBe(27)
    expect(career.titleChanges.some(change => change.kind === 'redesign')).toBe(true)
    expect(career.titleChanges.some(change => change.kind === 'personalized')).toBe(true)
    const unifications = career.titleChanges.filter(change => change.kind === 'unification')
    expect(unifications.length).toBeGreaterThan(0)
    const imported = importCareer(exportCareer(career))
    const states = titleStates(imported)
    for (const change of unifications) {
      const original = TITLES_BY_ID.get(change.titleId)!
      const secondary = TITLES_BY_ID.get(change.secondaryId)!
      expect(compatibleTitles(original, secondary)).toBe(true)
      expect(titleName(imported, original, change.date)).toBe(original.name)
      expect(titleName(imported, original)).toMatch(/Unificado/)
      expect(states.get(secondary.id)?.events.at(-1)?.kind).toBe('retired')
      expect(states.get(secondary.id)?.events.some(event => event.kind === 'defense')).toBe(true)
      expect(states.get(secondary.id)?.retiredBy).toBe(original.id)
      expect(states.get(secondary.id)?.holders).toBeNull()
      expect(career.shows.some(show => show.date > change.date && show.matches.some(match => match.titleId === secondary.id))).toBe(false)
      expect(beltsDue({ id: 'future', promotion: secondary.promotion, name: 'Evento', date: '2030-01-01',
        origin: 'generated', special: true }, states, 0).some(title => title.id === secondary.id)).toBe(false)
    }
    expect(imported.titleChanges).toEqual(career.titleChanges)
    expect(titleStates(second).size).toBe(62)
    expect(second.titleChanges).toEqual([])
    const first = unifications[0]
    expect(() => validateCareer({ ...career, titleChanges: [{ ...first, date: START_DATE }] })).toThrow(/mudança do cinturão/)
    expect(() => validateCareer({ ...career, titleChanges: career.titleChanges.map(change => change === first
      ? { ...change, secondaryId: 'aew-tag' } : change) })).toThrow(/unificados/)
  })

  it('oferece renovação negociável e mercado alternativo quando o vínculo termina', () => {
    const open = careerWithOffer('bwf')
    let career = signOffer(open, open.offers.find(offer => offer.promotion === 'bwf')!.id)
    const terms = career.contract!
    while (career.contract?.status === 'active') {
      career = advanceCareer(career)
      while (hasLiveBout(career)) career = resolvePlayerTurn(career, 'breathe')
    }
    const renewal = career.offers.find(offer => offer.promotion === 'bwf')!
    expect(renewal.pay).toBeGreaterThanOrEqual(terms.pay)
    const negotiated = negotiate(career, renewal.id, Math.round(renewal.pay * 1.1))
    const signed = signOffer(negotiated, renewal.id)
    expect(signed.contract?.start).toBe(terms.end)
    expect(signed.history.at(-1)?.title).toMatch(/^Renovação/)
    const alternate = career.offers.find(offer => offer.promotion !== 'bwf')!
    expect(validateCareer(signOffer(career, alternate.id)).contract?.promotion).toBe(alternate.promotion)
  })
})
