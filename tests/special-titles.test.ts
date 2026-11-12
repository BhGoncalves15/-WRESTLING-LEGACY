import { describe, expect, it } from 'vitest'
import { OPENING_TITLES, ROSTER, TITLES_BY_ID, fitsEventRoster, nextShows } from '../src/content/catalog'
import { NJPW_JUNIOR_IDS, TAMASHII_IDS } from '../src/content/roster-njpw'
import { defenseFormat } from '../src/content/titles'
import { TRIOS_DATA_VERSION, type Career, type Division, type PromotionId } from '../src/domain/model'
import { PLAYER_ID, advanceCareer, exampleProfile, hasLiveBout, newCareer, registerRingWeight, resolvePlayerTurn, setCareerTeam, signOffer } from '../src/engine/career'
import { matchTeams } from '../src/engine/matches'
import { isTagBout, legalFighterId } from '../src/engine/tag-combat'
import { availableTeamPartners } from '../src/engine/tag-teams'
import { fighterDivision, showSupportsTitle, titleStates, titleTeamEligible } from '../src/engine/titles'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'
import { careerWithOffer } from './fixtures'

function signed(promotion: PromotionId, division: Division = 'men') {
  const career = careerWithOffer(promotion, division)
  return signOffer(career, career.offers.find(offer => offer.promotion === promotion)!.id)
}

function pin(career: Career) {
  const bout = career.bout!
  const rival = { ...bout.rival, condition: 0, position: 'grounded' as const }
  if (!isTagBout(bout)) return resolvePlayerTurn({ ...career, bout: { ...bout, rival, plan: 'guard' } }, 'pin')
  const [first, second] = bout.tag.rival.partners
  const withoutStamina = (member: typeof first) => ({ ...member, side: { ...member.side, stamina: 0 } })
  const partners: typeof bout.tag.rival.partners = second ? [withoutStamina(first), withoutStamina(second)] : [withoutStamina(first)]
  return resolvePlayerTurn({ ...career, bout: {
    ...bout, rival, plan: 'guard', tag: { ...bout.tag, rival: { ...bout.tag.rival, partners } },
  } }, 'pin')
}

function huntTitle(career: Career, titleId: string) {
  let current = advanceCareer(career)
  for (let count = 0; count < 55 && current.contract?.status === 'active' && current.bout?.titleId !== titleId; count++) {
    current = advanceCareer(hasLiveBout(current) ? pin(current) : current)
  }
  expect(current.bout?.titleId).toBe(titleId)
  return current
}

describe('cinturões de duplas especiais', () => {
  it.each([['men', 'faby-apache'], ['women', 'mr-iguana']] as const)(
    'escala uma dupla mista na divisão %s e sincroniza as tags dos dois lados',
    (division, partner) => {
      const career = signed('aaa', division)
      const sameDivision = division === 'men' ? 'mr-iguana' : 'faby-apache'
      expect(() => setCareerTeam(career, 'mixed', [sameDivision])).toThrow(/disponíveis/)
      expect(availableTeamPartners(career, 'mixed').map(fighter => fighter.id)).toContain(partner)
      const debut = advanceCareer(setCareerTeam(career, 'mixed', [partner]))
      const bout = debut.bout!
      expect(bout.tag?.mixed).toBe(true)
      expect(fighterDivision(debut, bout.rivalId)).toBe(division)
      const tagged = resolvePlayerTurn({ ...debut, bout: { ...bout, plan: 'guard' } }, 'tag')
      expect(tagged.bout?.tag?.player.legalIndex).toBe(1)
      expect(tagged.bout?.tag?.rival.legalIndex).toBe(1)
      expect(legalFighterId(tagged.bout!, 'player', PLAYER_ID)).toBe(partner)
      expect(tagged.bout?.log.some(entry => entry.text.includes('entrou após a tag da outra dupla'))).toBe(true)
      expect(importCareer(exportCareer(tagged)).bout).toEqual(tagged.bout)
      const rivalTag = resolvePlayerTurn({ ...debut, bout: { ...bout, plan: 'tag' } }, 'guard')
      expect(rivalTag.bout?.tag?.player.legalIndex).toBe(1)
      expect(rivalTag.bout?.tag?.rival.legalIndex).toBe(1)
      expect(validateCareer(rivalTag)).toEqual(rivalTag)
    },
  )

  it('conquista e libera o título misto em uma carreira que também tem dupla regular', () => {
    const regular = setCareerTeam(signed('aaa'), 'tag', ['mr-iguana'])
    const mixed = setCareerTeam(regular, 'mixed', ['faby-apache'])
    const contender = huntTitle(mixed, 'aaa-mixed')
    const winner = pin(contender)
    expect(titleStates(winner).get('aaa-mixed')?.holders).toEqual([PLAYER_ID, 'faby-apache'])
    expect(winner.shows.find(show => show.id === winner.bout?.showId)?.matches.find(match => match.player)?.tag?.mixed).toBe(true)
    const ended = setCareerTeam(winner, 'mixed', null)
    expect(ended.tagPartnerId).toBe('mr-iguana')
    expect(ended.preferredFormat).toBe('tag')
    expect(titleStates(ended).get('aaa-mixed')?.holders).toBeNull()
    expect(validateCareer(ended)).toEqual(ended)
  })

  it('aplica o limite de 100 kg no Junior e exige que o parceiro também seja elegível', () => {
    const career = signed('njpw')
    const junior = TITLES_BY_ID.get('njpw-junior')!
    const duo = TITLES_BY_ID.get('njpw-junior-tag')!
    const atLimit = { ...career, profile: { ...career.profile, ringWeightKg: 100 } }
    const above = { ...career, profile: { ...career.profile, ringWeightKg: 101 } }
    expect(titleTeamEligible(atLimit, junior, [PLAYER_ID])).toBe(true)
    expect(titleTeamEligible(above, junior, [PLAYER_ID])).toBe(false)
    expect(titleTeamEligible(atLimit, duo, [PLAYER_ID, 'yoh'])).toBe(true)
    expect(titleTeamEligible(atLimit, duo, [PLAYER_ID, 'oskar'])).toBe(false)
    expect(titleTeamEligible(above, duo, [PLAYER_ID, 'yoh'])).toBe(false)
    const singlesWinner = pin(huntTitle(atLimit, junior.id))
    expect(titleStates(singlesWinner).get(junior.id)?.holders).toEqual([PLAYER_ID])
    expect(validateCareer(singlesWinner)).toEqual(singlesWinner)
    const qualified = setCareerTeam(atLimit, 'tag', ['yoh'])
    const winner = pin(huntTitle(qualified, duo.id))
    expect(titleStates(winner).get(duo.id)?.holders).toEqual([PLAYER_ID, 'yoh'])
    expect(validateCareer(winner)).toEqual(winner)
  })

  it('disputa TAMASHII nos cards regionais e mantém seus lutadores fora do card regular', () => {
    const shows = nextShows('njpw', '2026-01-01', 10)
    const regional = shows.find(show => show.series === 'tamashii')!
    const regular = shows.find(show => !show.series)!
    const belt = TITLES_BY_ID.get('njpw-tamashii-tag')!
    expect(regional.name).toBe('NJPW TAMASHII')
    expect(showSupportsTitle(regional, belt)).toBe(true)
    expect(showSupportsTitle(regular, belt)).toBe(false)
    expect(showSupportsTitle(regional, TITLES_BY_ID.get('njpw-tag')!)).toBe(false)
    expect(fitsEventRoster(regional, 'finn-grant')).toBe(true)
    expect(fitsEventRoster(regular, 'finn-grant')).toBe(false)
    const career = setCareerTeam(signed('njpw'), 'tag', ['finn-grant'])
    const contender = huntTitle(career, belt.id)
    const winner = pin(contender)
    expect(winner.shows.find(show => show.id === contender.bout?.showId)?.series).toBe('tamashii')
    expect(titleStates(winner).get(belt.id)?.holders).toEqual([PLAYER_ID, 'finn-grant'])
    expect(validateCareer(winner)).toEqual(winner)
  })

  it('conserva a parceria antiga quando um título novo entra no catálogo jogável', () => {
    const career = signed('njpw')
    const { ringWeightKg: _ringWeight, ...profile } = career.profile
    const { mixedPartnerId: _mixed, ...fields } = career
    const legacy = { ...fields, profile, tagPartnerId: 'douki', preferredFormat: 'tag', schemaVersion: 4, dataVersion: TRIOS_DATA_VERSION }
    const loaded = importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 4, career: legacy }))
    expect(loaded.tagPartnerId).toBe('douki')
    expect(loaded.profile.ringWeightKg).toBeNull()
    expect(loaded.mixedPartnerId).toBeNull()
    expect(() => registerRingWeight(loaded, 20)).toThrow(/peso de ringue/)
    const withWeight = registerRingWeight(loaded, 99)
    expect(titleTeamEligible(withWeight, TITLES_BY_ID.get('njpw-junior-tag')!, [PLAYER_ID, 'douki'])).toBe(true)
    expect(validateCareer(advanceCareer(withWeight)).tagPartnerId).toBe('douki')
  })

  it('simula os quatro novos títulos e confere as divisões e o calendário de cada disputa', () => {
    let career = newCareer(exampleProfile(), 'normal', { seed: 2405 })
    expect(new Set(ROSTER.map(fighter => fighter.id)).size).toBe(300)
    expect(OPENING_TITLES.filter(title => defenseFormat(title)).length).toBe(62)
    while (career.date < '2026-07-01') career = advanceCareer(career)
    const ids = ['aaa-mixed', 'njpw-junior', 'njpw-junior-tag', 'njpw-tamashii-tag']
    const seen = new Set<string>()
    for (const show of career.shows) {
      for (const match of show.matches) {
        if (!match.titleId || !ids.includes(match.titleId)) continue
        seen.add(match.titleId)
        const teams = matchTeams(match)
        if (match.titleId === 'aaa-mixed') {
          expect(match.tag?.mixed).toBe(true)
          expect(teams.every(team => new Set(team.map(id => fighterDivision(career, id))).size === 2)).toBe(true)
        } else if (match.titleId === 'njpw-tamashii-tag') {
          expect(show.series).toBe('tamashii')
          expect(teams.flat().every(id => TAMASHII_IDS.has(id))).toBe(true)
        } else expect(teams.flat().every(id => NJPW_JUNIOR_IDS.has(id))).toBe(true)
      }
    }
    expect(seen).toEqual(new Set(ids))
    expect(validateCareer(career)).toEqual(career)
  })
})
