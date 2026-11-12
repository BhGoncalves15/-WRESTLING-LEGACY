import { describe, expect, it } from 'vitest'
import { OPENING_TITLES, ORGANIZATIONS, nextShows } from '../src/content/catalog'
import { TEAM_REFERENCES } from '../src/content/tag-teams'
import { supportsTagDefense } from '../src/content/titles'
import { COMPANIES, TAG_DATA_VERSION, WORLD_DATA_VERSION, type BoutSide, type Career, type TagBout } from '../src/domain/model'
import { PLAYER_ID, advanceCareer, exampleProfile, hasLiveBout, newCareer, recordFor, resolvePlayerTurn, setCareerTeam, signOffer } from '../src/engine/career'
import { matchTeams, matchWinners } from '../src/engine/matches'
import { isTagBout } from '../src/engine/tag-combat'
import { availableTeamPartners, teamRecordFor } from '../src/engine/tag-teams'
import { applyTitleMatch, titleEligible, titleStates } from '../src/engine/titles'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'
import { careerWithOffer } from './fixtures'

const PARTNER = 'hank-walker'

function nxtCareer() {
  const career = careerWithOffer('nxt')
  return signOffer(career, career.offers.find(offer => offer.promotion === 'nxt')!.id)
}

function boutOf(career: Career): TagBout {
  if (!career.bout || !isTagBout(career.bout)) throw new Error('A carreira precisa estar em uma luta de duplas.')
  return career.bout
}

function tagDebut() {
  return advanceCareer(setCareerTeam(nxtCareer(), 'tag', [PARTNER]))
}

function tagOut(career: Career) {
  return resolvePlayerTurn({ ...career, bout: { ...boutOf(career), plan: 'guard' } }, 'tag')
}

function withReserve(corner: TagBout['tag']['player'], patch: Partial<BoutSide>): TagBout['tag']['player'] {
  const [partner] = corner.partners
  return { ...corner, partners: [{ ...partner, side: { ...partner.side, ...patch } }] }
}

function winByPin(career: Career) {
  const bout = boutOf(career)
  return resolvePlayerTurn({
    ...career,
    bout: {
      ...bout, plan: 'guard', rival: { ...bout.rival, condition: 0, position: 'grounded' },
      tag: { ...bout.tag, rival: withReserve(bout.tag.rival, { stamina: 0 }) },
    },
  }, 'pin')
}

describe('Tag Team', () => {
  it('forma uma dupla da mesma divisão e impede trocar a parceria durante a luta', () => {
    const signed = nxtCareer()
    expect(availableTeamPartners(signed, 'tag').map(fighter => fighter.id)).toContain(PARTNER)
    expect(() => setCareerTeam(signed, 'tag', ['dion-lennox'])).toThrow(/disponíveis/)
    expect(() => setCareerTeam(signed, 'tag', ['jacy-jayne'])).toThrow(/disponíveis/)
    expect(() => setCareerTeam(signed, 'tag', ['aj-styles'])).toThrow(/disponíveis/)
    const fight = tagDebut()
    expect(boutOf(fight).tag.player.partners[0].id).toBe(PARTNER)
    expect(() => setCareerTeam(fight, 'tag', null)).toThrow(/luta em andamento/)
    expect(validateCareer(fight)).toEqual(fight)
    const bout = boutOf(fight)
    const duplicate = { ...bout, tag: { ...bout.tag, rival: {
      ...bout.tag.rival, partners: [{ ...bout.tag.rival.partners[0], id: PARTNER }],
    } } }
    expect(() => validateCareer({ ...fight, bout: duplicate })).toThrow(/luta/)
  })

  it('troca os lutadores legais e restaura o apron e o turno pelo save', () => {
    const initial = tagDebut()
    const tagged = tagOut(initial)
    expect(boutOf(initial).tag.player.legalIndex).toBe(0)
    expect(boutOf(tagged).tag.player).toMatchObject({ legalIndex: 1, lastTagTurn: 1 })
    expect(boutOf(tagged).used).toEqual(['tag'])
    expect(boutOf(tagged).log.some(entry => entry.text.includes('Hank Walker entrou'))).toBe(true)
    expect(() => resolvePlayerTurn(tagged, 'dropkick')).toThrow(/parceiro está no ringue/)
    expect(() => resolvePlayerTurn(tagged, 'ask-tag')).toThrow(/dois turnos/)
    let reloaded = importCareer(exportCareer(tagged))
    expect(reloaded.bout).toEqual(tagged.bout)
    for (let turn = 0; turn < 2; turn++) {
      reloaded = resolvePlayerTurn({ ...reloaded, bout: { ...boutOf(reloaded), plan: 'guard' } }, 'watch')
    }
    const returned = resolvePlayerTurn({ ...reloaded, bout: { ...boutOf(reloaded), plan: 'guard' } }, 'ask-tag')
    expect(boutOf(returned).tag.player).toMatchObject({ legalIndex: 0, lastTagTurn: 4 })
    expect(boutOf(returned).used).toEqual(['tag', 'watch', 'watch', 'ask-tag'])
    expect(validateCareer(returned)).toEqual(returned)
  })

  it('salva o parceiro de uma contagem e aplica uma única chance de salvamento à dupla', () => {
    const tagged = tagOut(tagDebut())
    const endangered = (career: Career): Career => {
      const bout = boutOf(career)
      return {
        ...career,
        bout: {
          ...bout, plan: 'pin', rival: { ...bout.rival, stamina: 100, position: 'standing' },
          tag: { ...bout.tag, player: withReserve(bout.tag.player, { condition: 0, position: 'grounded' }) },
        },
      }
    }
    const saved = resolvePlayerTurn(endangered(tagged), 'save-partner')
    expect(boutOf(saved).finish).toBeNull()
    expect(boutOf(saved).tag.player.saveUsed).toBe(true)
    expect(boutOf(saved).log.some(entry => entry.turn === saved.bout?.turn && entry.text.includes('BH interrompeu a contagem'))).toBe(true)
    const reloaded = importCareer(exportCareer(saved))
    expect(boutOf(reloaded).tag.player.saveUsed).toBe(true)
    expect(() => resolvePlayerTurn(endangered(reloaded), 'save-partner')).toThrow(/já usou/)
    const lost = resolvePlayerTurn(endangered(reloaded), 'watch')
    expect(boutOf(lost).finish).toEqual({ winner: 'rival', method: 'pinfall' })
    expect(recordFor(lost, PLAYER_ID).losses).toBe(1)
    expect(teamRecordFor(lost, [PARTNER])).toEqual({ wins: 0, losses: 1 })
    expect(validateCareer(lost)).toEqual(lost)
  })

  it('credita XP, pagamento e vitória ao jogador quando o parceiro finaliza', () => {
    let career = tagOut(tagDebut())
    for (let turn = 0; turn < 16 && hasLiveBout(career); turn++) {
      const bout = boutOf(career)
      career = resolvePlayerTurn({
        ...career,
        bout: {
          ...bout, plan: 'guard', rival: { ...bout.rival, condition: 0, position: 'grounded' },
          tag: { ...bout.tag, rival: withReserve(bout.tag.rival, { stamina: 0 }) },
        },
      }, 'watch')
    }
    const bout = boutOf(career)
    const result = career.shows.find(show => show.id === bout.showId)?.matches.find(match => match.player)
    expect(bout.finish?.winner).toBe('player')
    expect(result?.winnerId).toBe(PARTNER)
    expect(matchWinners(result!)).toEqual([PLAYER_ID, PARTNER])
    expect(recordFor(career, PLAYER_ID).wins).toBe(1)
    expect(career.xp).toBeGreaterThan(0)
    expect(career.ledger[0].amount).toBe(career.contract!.pay + career.contract!.winBonus)
    expect(validateCareer(career)).toEqual(career)
  })

  it('conquista um cinturão em dupla, preserva os campeões e deixa o título vago ao encerrar a parceria', () => {
    let career = tagDebut()
    for (let attempt = 0; attempt < 12 && !career.bout?.titleId; attempt++) {
      career = advanceCareer(winByPin(career))
    }
    const titleId = boutOf(career).titleId!
    expect(titleId).toBe('nxt-tag')
    expect(teamRecordFor(career, [PARTNER]).wins).toBeGreaterThanOrEqual(2)
    const champion = winByPin(career)
    const title = titleStates(champion).get(titleId)
    expect(title?.holders).toEqual([PLAYER_ID, PARTNER])
    expect(title?.events.at(-1)?.kind).toBe('change')
    expect(titleStates(importCareer(exportCareer(champion))).get(titleId)).toEqual(title)
    const ended = setCareerTeam(champion, 'tag', null)
    expect(titleStates(ended).get(titleId)?.events.at(-1)).toMatchObject({ kind: 'vacancy', from: [PLAYER_ID, PARTNER], to: null })
    expect(ended.shows).toEqual(champion.shows)
    expect(validateCareer(ended)).toEqual(ended)

    let expired = champion
    while (expired.contract?.status === 'active') {
      expired = advanceCareer(hasLiveBout(expired) ? winByPin(expired) : expired)
    }
    expect(expired.tagPartnerId).toBe(PARTNER)
    const otherBrand = expired.offers.find(offer => offer.promotion !== 'nxt')!
    const transferred = signOffer(expired, otherBrand.id)
    expect(transferred.contract?.promotion).toBe(otherBrand.promotion)
    expect(transferred.tagPartnerId).toBeNull()
    expect(titleStates(transferred).get(titleId)?.holders).toBeNull()
    expect(validateCareer(transferred)).toEqual(transferred)
  })

  it('reconhece uma defesa mesmo quando os dois campeões entram na ordem inversa', () => {
    const career = nxtCareer()
    const states = titleStates(career)
    const show = nextShows('nxt', '2026-01-01', 1)[0]
    const match = {
      id: show.id + '/match-1', firstId: 'osiris-griffin', secondId: 'hank-walker', winnerId: 'dion-lennox',
      method: 'pinfall' as const, rounds: 11, player: false, titleId: 'nxt-tag',
      tag: { firstPartners: ['dion-lennox'], secondPartners: ['tank-ledger'] },
    }
    applyTitleMatch(states, career, show, match)
    expect(states.get('nxt-tag')?.defenses).toBe(1)
    expect(states.get('nxt-tag')?.events.at(-1)?.kind).toBe('defense')
    expect(() => applyTitleMatch(states, career, show, { ...match, tag: undefined })).toThrow(/cinturão/)
    expect(() => applyTitleMatch(states, career, show, { ...match, tag: { ...match.tag, firstPartners: ['saquon-shugars'] } })).toThrow(/campeão vigente/)
  })

  it('simula os 13 títulos de duplas nas sete empresas com quatro nomes por luta', () => {
    let career = newCareer(exampleProfile(), 'normal', { seed: 4402 })
    const belts = OPENING_TITLES.filter(supportsTagDefense)
    expect(belts).toHaveLength(13)
    for (const title of belts) expect(title.holderTeam?.every(id => titleEligible(career, title, id))).toBe(true)
    while (career.date < '2026-07-01') career = advanceCareer(career)
    const results = career.shows.flatMap(show => show.matches.filter(match => match.tag?.firstPartners.length === 1 && match.titleId).map(match => ({ match, show })))
    expect(new Set(results.map(({ match }) => match.titleId))).toEqual(new Set(belts.map(title => title.id)))
    expect(new Set(results.map(({ show }) => ORGANIZATIONS[show.promotion].company))).toEqual(new Set(COMPANIES))
    expect(results.every(({ match }) => new Set(matchTeams(match).flat()).size === 4)).toBe(true)
    expect(TEAM_REFERENCES.filter(team => team.members.length === 2).length).toBeGreaterThan(13)
    expect(validateCareer(career)).toEqual(career)
  })

  it('migra um save v2 em luta individual sem mudar seu turno nem seu calendário', () => {
    const career = resolvePlayerTurn(advanceCareer(nxtCareer()), 'guard')
    const { tagPartnerId: _tagPartnerId, trioPartnerIds: _trioPartnerIds, preferredFormat: _preferredFormat, ...fields } = career
    const versionTwo = {
      ...fields, schemaVersion: 2, dataVersion: WORLD_DATA_VERSION,
      shows: career.shows.map(show => ({ ...show, matches: show.matches.filter(match => !match.tag) })),
    }
    const upgraded = importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 2, career: versionTwo }))
    expect(upgraded.tagPartnerId).toBeNull()
    expect(upgraded.bout).toEqual(versionTwo.bout)
    expect(upgraded.shows).toEqual(versionTwo.shows)
    expect(upgraded.vacatedTitles).toEqual(versionTwo.vacatedTitles)
    expect(resolvePlayerTurn(upgraded, 'guard').bout?.turn).toBe(2)
  })

  it('migra a versão 3 com dupla em andamento e mantém a próxima ação determinística', () => {
    const career = tagOut(tagDebut())
    const bout = boutOf(career)
    const oldCorner = ({ partners, legalIndex, ...state }: TagBout['tag']['player']) => ({
      ...state, partnerId: partners[0].id, partner: partners[0].side, partnerLegal: legalIndex === 1,
    })
    const { trioPartnerIds: _trioPartnerIds, preferredFormat: _preferredFormat, ...fields } = career
    const versionThree = {
      ...fields, schemaVersion: 3, dataVersion: TAG_DATA_VERSION,
      bout: { ...bout, tag: { player: oldCorner(bout.tag.player), rival: oldCorner(bout.tag.rival) } },
      shows: career.shows.map(show => ({
        ...show, matches: show.matches.filter(match => !match.tag || match.tag.firstPartners.length === 1).map(match => match.tag
          ? { ...match, tag: { firstPartnerId: match.tag.firstPartners[0], secondPartnerId: match.tag.secondPartners[0] } } : match),
      })),
    }
    const upgraded = importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 3, career: versionThree }))
    expect(upgraded.preferredFormat).toBe('tag')
    expect(upgraded.trioPartnerIds).toBeNull()
    expect(upgraded.bout).toEqual(bout)
    expect(resolvePlayerTurn(upgraded, 'watch').bout).toEqual(resolvePlayerTurn(career, 'watch').bout)
  })
})
