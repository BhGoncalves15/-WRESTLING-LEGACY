import { describe, expect, it } from 'vitest'
import { ANNOUNCED_SHOWS, OPENING_TITLES, ROSTER, ROSTER_BY_ID, upcomingShows } from '../src/content/catalog'
import { defaultMoves, validMoveset } from '../src/content/moves'
import { ATTRIBUTES, INITIAL_BUDGET, PROMOTIONS, STYLES, addDays, overall, pointsSpent, suggestedAttributes, type Career } from '../src/domain/model'
import {
  PLAYER_ID, advanceCareer, balanceFor, declineOffer, exampleProfile, hasLiveBout, improveAttribute, improveMove,
  negotiate, newCareer, playerFor, recordFor, renewOffers, resolvePlayerTurn, setDifficulty, signOffer,
} from '../src/engine/career'
import { reasonUnavailable } from '../src/engine/combat'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'

const ID = 'c0a80101-beca-41da-8662-5bf96be05020'
const COPY_ID = 'c0a80101-beca-41da-8662-5bf96be05021'
const identity = { id: ID, seed: 123_456, createdAt: 1 }
const fresh = () => newCareer(exampleProfile(), 'normal', identity)

function startFight(career = fresh(), promotion: 'nxt' | 'tna' | 'roh' = 'nxt') {
  const offer = career.offers.find(item => item.promotion === promotion)!
  return advanceCareer(signOffer(career, offer.id))
}

function actionFor(career: Career) {
  const bout = career.bout!
  const player = playerFor(career)
  if (bout.player.position === 'grounded') return 'breathe'
  const eligible = (id: string) => !reasonUnavailable(bout, 'player', player, id, bout.plan)
  const priorities = bout.rival.condition < 52 ? ['pin', 'submit'] : []
  return [...priorities, 'cutter', 'ddt', 'backdrop', 'rollthrough', 'clothesline', 'dropkick', 'jab', 'breathe'].find(eligible)!
}

describe('criação e contratos', () => {
  it.each(STYLES)('usa 180 pontos e um moveset válido em %s', style => {
    const attrs = suggestedAttributes(style)
    expect(pointsSpent(attrs)).toBe(INITIAL_BUDGET)
    expect(Math.max(...ATTRIBUTES.map(key => attrs[key]))).toBeLessThanOrEqual(90)
    expect(validMoveset(defaultMoves(style))).toBe(true)
  })

  it('abre em 01/01 e gera propostas determinísticas para três empresas', () => {
    const first = fresh()
    expect(first).toEqual(fresh())
    expect(first.date).toBe('2026-01-01')
    expect(first.worldThrough).toBe('2025-12-31')
    expect(first.offers.map(item => item.promotion)).toEqual(PROMOTIONS)
    expect(validateCareer(first)).toEqual(first)
  })

  it('rejeita um personagem com pontos ou golpes inválidos', () => {
    const profile = exampleProfile()
    expect(() => newCareer({ ...profile, moves: Array(20).fill('jab') }, 'normal', identity)).toThrow(/moveset/)
    expect(() => newCareer({ ...profile, attributes: { ...profile.attributes, strength: 91 } }, 'normal', identity)).toThrow(/180 pontos/)
  })

  it('responde uma vez à contraproposta e usa o pagamento final no contrato', () => {
    const career = fresh()
    const original = career.offers[0]
    const pay = Math.ceil(original.pay * 1.12)
    const answered = negotiate(career, original.id, pay)
    const offer = answered.offers[0]
    expect(offer.response).not.toBe('pending')
    expect(offer.pay).toBe(offer.response === 'accepted' ? pay : original.pay)
    expect(() => negotiate(answered, original.id, pay)).toThrow(/já respondeu/)
    const signed = signOffer(answered, offer.id)
    expect(signed.contract?.pay).toBe(offer.pay)
    expect(signed.contract?.end).toBe(addDays(career.date, offer.weeks * 7))
    expect(signed.offers).toHaveLength(0)
  })

  it('reabre o mercado após recusar tudo, enquanto a agenda avança', () => {
    const original = fresh()
    const refused = original.offers.reduce((state, offer) => declineOffer(state, offer.id), original)
    const renewed = renewOffers(refused)
    expect(renewed.date).toBe('2026-01-08')
    expect(renewed.offers.every(offer => offer.status === 'available')).toBe(true)
    expect(new Set(renewed.shows.map(show => show.promotion)).size).toBe(3)
    expect(renewed.offers[0].id).not.toBe(original.offers[0].id)
  })
})

describe('combate, agenda e XP', () => {
  it('separa agenda anunciada e gerada e mantém identidades canônicas no recorte', () => {
    expect(new Set(ROSTER.map(fighter => fighter.id)).size).toBe(ROSTER.length)
    expect(ROSTER.every(fighter => fighter.appearance.date < '2026-01-01')).toBe(true)
    expect(upcomingShows('2026-01-14', 4).find(show => show.name === 'TNA Genesis')?.origin).toBe('announced')
    expect(ANNOUNCED_SHOWS.every(show => show.origin === 'announced')).toBe(true)
    expect(OPENING_TITLES.find(title => title.id === 'tna-knockouts-tv')?.holder).toBeNull()
  })

  it('simula TNA enquanto agenda a estreia em NXT e impede avanço durante a luta', () => {
    const career = startFight()
    expect(career.date).toBe('2026-01-06')
    expect(career.shows.map(show => show.promotion)).toEqual(['tna', 'nxt'])
    expect(career.shows[0].matches).toHaveLength(2)
    expect(career.bout?.turn).toBe(0)
    expect(() => advanceCareer(career)).toThrow(/andamento/)
    expect(() => resolvePlayerTurn(career, 'pin')).toThrow(/Derrube/)
    expect(() => resolvePlayerTurn(career, 'moonsault')).toThrow(/corner/)
    expect(() => resolvePlayerTurn(career, 'cutter')).toThrow(/momentum/)
  })

  it('usa a divisão correta para o rival da personagem', () => {
    const career = newCareer({ ...exampleProfile(), division: 'women' }, 'normal', identity)
    const first = startFight(career, 'tna')
    expect(ROSTER_BY_ID.get(first.bout!.rivalId)?.division).toBe('women')
    expect(first.date).toBe('2026-01-01')
    expect(validateCareer(first)).toEqual(first)
  })

  it('retoma um turno do save e fecha resultado, XP e pagamento uma única vez', () => {
    const initial = startFight()
    const first = resolvePlayerTurn(initial, actionFor(initial))
    expect(first.bout?.turn).toBe(1)
    expect(first).toEqual(resolvePlayerTurn(initial, actionFor(initial)))
    let career = importCareer(exportCareer(first), COPY_ID)
    expect(career.bout).toEqual(first.bout)
    expect(career.rng).toBe(first.rng)
    let attempts = 0
    while (hasLiveBout(career) && attempts++ < 65) career = resolvePlayerTurn(career, actionFor(career))
    expect(career.bout?.finish).not.toBeNull()
    expect(career.xp).toBe(career.bout?.xpAwarded)
    expect(recordFor(career, PLAYER_ID).total).toBe(1)
    expect(career.ledger).toHaveLength(1)
    expect(balanceFor(career)).toBeGreaterThan(0)
    expect(() => resolvePlayerTurn(career, 'jab')).toThrow(/show/)
    expect(validateCareer(career)).toEqual(career)
    const advanced = advanceCareer(career)
    expect(new Set(advanced.shows.map(show => show.promotion)).size).toBe(3)
    expect(advanced.shows.filter(show => show.id === first.bout?.showId)).toHaveLength(1)
    expect(career.shows).not.toEqual(advanced.shows)
    expect(career.id).not.toBe(first.id)
  })

  it('permite finais legítimos por pinfall e submissão e preserva os atributos em cada dificuldade', () => {
    const career = startFight()
    const bout = { ...career.bout!, rival: { ...career.bout!.rival, condition: 0, position: 'grounded' as const }, plan: 'guard' }
    for (const [action, method] of [['pin', 'pinfall'], ['submit', 'submission']] as const) {
      const result = resolvePlayerTurn({ ...career, bout }, action)
      expect(result.bout?.finish).toEqual({ winner: 'player', method })
    }
    const hard = setDifficulty(career, 'hard')
    expect(hard.profile.attributes).toEqual(career.profile.attributes)
    expect(overall(hard.profile.attributes, hard.profile.style)).toBe(overall(career.profile.attributes, career.profile.style))
  })

  it('gasta XP em atributos e golpes e respeita os limites de evolução', () => {
    const initial = fresh()
    const profile = { ...initial.profile, attributes: { ...initial.profile.attributes, strength: 99 } }
    const wealthy = { ...initial, profile, ledger: [{ id: 'p', date: initial.date, label: 'teste', amount: 1000 }] }
    expect(() => improveAttribute(wealthy, 'strength')).toThrow(/XP/)
    const upgraded = improveAttribute({ ...wealthy, xp: 500 }, 'strength')
    expect(upgraded.profile.attributes.strength).toBe(100)
    expect(balanceFor(upgraded)).toBe(balanceFor(wealthy))
    expect(() => improveAttribute(upgraded, 'strength')).toThrow(/teto/)
    const enhanced = improveMove(upgraded, 'jab')
    expect(enhanced.profile.moveLevels.jab).toBe(1)
    expect(enhanced.xp).toBe(upgraded.xp - 18)
  })

  it('simula um ano das três empresas sem lutas nem eventos duplicados', () => {
    let career = fresh()
    while (career.date < '2027-01-01') career = advanceCareer(career)
    expect(career.shows.length).toBeGreaterThan(150)
    for (const promotion of PROMOTIONS) {
      const reports = career.shows.filter(show => show.promotion === promotion)
      expect(reports.length).toBeGreaterThan(49)
      expect(reports.every(show => show.matches.length === 2)).toBe(true)
    }
    expect(validateCareer(career)).toEqual(career)
  })

  it('libera o mercado quando um contrato termina sem duplicar eventos', () => {
    const active = signOffer(fresh(), fresh().offers[0].id)
    const date = addDays(active.contract!.end, -1)
    const nearEnd = { ...active, date, worldThrough: date }
    const expired = advanceCareer(nearEnd)
    expect(expired.contract?.status).toBe('expired')
    expect(expired.date).toBe(active.contract?.end)
    expect(expired.offers).toHaveLength(3)
    expect(validateCareer(expired)).toEqual(expired)
  })
})
