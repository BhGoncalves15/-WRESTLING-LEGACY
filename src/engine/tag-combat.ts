import type { Fighter } from '../content/roster-model'
import { clamp, type Actor, type Bout, type BoutSide, type Difficulty, type Show, type TagBout } from '../domain/model'
import { chooseAction, createBout, reasonUnavailable, resolveExchange } from './combat'
import type { Random } from './random'

export type TagLineup = Record<Actor, readonly [Fighter, Fighter]>

export const TAG_ACTIONS = {
  tag: { name: 'Fazer a tag', description: 'Coloque seu parceiro no ringue e recupere stamina no apron.' },
  'ask-tag': { name: 'Pedir a tag', description: 'Peça a troca para voltar ao ringue.' },
  watch: { name: 'Acompanhar o turno', description: 'Seu parceiro decide a ação no ringue.' },
  'save-partner': { name: 'Salvar parceiro', description: 'Interrompa uma finalização do rival. Uma vez por dupla.' },
} as const

const TAG_STAMINA = 8
const SAVE_STAMINA = 14
const CORNERS = ['player', 'rival'] as const

export function isTagBout(bout: Bout): bout is TagBout {
  return bout.tag !== undefined
}

export function legalFighterId(bout: Bout, actor: Actor, starterId: string): string {
  const tag = bout.tag?.[actor]
  return tag?.partnerLegal ? tag.partnerId : starterId
}

function legalSide(bout: TagBout, actor: Actor): BoutSide {
  const corner = bout.tag[actor]
  return corner.partnerLegal ? corner.partner : bout[actor]
}

function apronSide(bout: TagBout, actor: Actor): BoutSide {
  const corner = bout.tag[actor]
  return corner.partnerLegal ? bout[actor] : corner.partner
}

function legalFighter(bout: TagBout, actor: Actor, lineup: TagLineup) {
  return lineup[actor][bout.tag[actor].partnerLegal ? 1 : 0]
}

export function tagSwapUnavailable(bout: TagBout, actor: Actor): string | null {
  const outgoing = legalSide(bout, actor)
  const lastTag = bout.tag[actor].lastTagTurn
  if (outgoing.position !== 'standing') return 'O lutador no ringue precisa estar em pé.'
  if (lastTag !== null && bout.turn - lastTag < 2) return 'Espere dois turnos entre trocas da mesma dupla.'
  if (outgoing.stamina < TAG_STAMINA || apronSide(bout, actor).stamina < TAG_STAMINA) return 'A troca exige stamina dos dois lutadores.'
  return null
}

export function tagActionUnavailable(bout: TagBout, player: Fighter, action: string): string | null {
  if (bout.finish) return 'A luta terminou.'
  if (!bout.tag.player.partnerLegal) {
    if (action === 'tag') return tagSwapUnavailable(bout, 'player')
    if (Object.hasOwn(TAG_ACTIONS, action)) return 'Esta ação é para quem está no apron.'
    return reasonUnavailable(duelView(bout), 'player', player, action, bout.plan)
  }
  if (action === 'watch') return null
  if (action === 'ask-tag') return tagSwapUnavailable(bout, 'player')
  if (action === 'save-partner') {
    if (bout.tag.player.saveUsed) return 'Sua dupla já usou o salvamento.'
    if (bout.player.stamina < SAVE_STAMINA) return 'Você precisa de 14 de stamina.'
    return bout.plan === 'pin' || bout.plan === 'submit' ? null : 'Espere o rival preparar um pinfall ou uma submissão.'
  }
  return 'Seu parceiro está no ringue. Peça a tag para voltar.'
}

function duelView(bout: TagBout): TagBout {
  return { ...bout, player: legalSide(bout, 'player'), rival: legalSide(bout, 'rival') }
}

function tagPlan(bout: TagBout, actor: Actor, lineup: TagLineup, difficulty: Difficulty, random: Random, canSwap = true) {
  const active = legalSide(bout, actor)
  const reserve = apronSide(bout, actor)
  const needsTag = active.condition + 18 < reserve.condition || active.stamina + 28 < reserve.stamina
  if (canSwap && needsTag && !tagSwapUnavailable(bout, actor) && random.next() < 0.55) return 'tag'
  return chooseAction(duelView(bout), actor, legalFighter(bout, actor, lineup), difficulty, random)
}

export function createTagBout(show: Show, id: string, lineup: TagLineup, difficulty: Difficulty, random: Random): TagBout {
  const bout = createBout(show, id, lineup.rival[0], difficulty, random)
  return {
    ...bout,
    tag: {
      player: { partnerId: lineup.player[1].id, partner: { ...bout.player }, partnerLegal: false, lastTagTurn: null, saveUsed: false },
      rival: { partnerId: lineup.rival[1].id, partner: { ...bout.rival }, partnerLegal: false, lastTagTurn: null, saveUsed: false },
    },
  }
}

function exchangeTag(
  source: TagBout, lineup: TagLineup, difficulty: Difficulty, action: string, random: Random, playerControlled: boolean,
): TagBout {
  const bout: TagBout = {
    ...source, player: { ...source.player }, rival: { ...source.rival }, log: [...source.log],
    tag: {
      player: { ...source.tag.player, partner: { ...source.tag.player.partner } },
      rival: { ...source.tag.rival, partner: { ...source.tag.rival.partner } },
    },
  }
  const playerAction = action === 'watch' || action === 'save-partner'
    ? tagPlan(source, 'player', lineup, difficulty, random, action === 'watch')
    : action === 'ask-tag' ? 'tag' : action
  const actions = { player: playerAction, rival: source.plan }

  for (const actor of CORNERS) {
    if (actions[actor] !== 'tag') continue
    const outgoing = legalFighter(bout, actor, lineup).name
    legalSide(bout, actor).stamina -= TAG_STAMINA
    bout.tag[actor].partnerLegal = !bout.tag[actor].partnerLegal
    bout.tag[actor].lastTagTurn = bout.turn + 1
    const incoming = legalFighter(bout, actor, lineup).name
    bout.log.push({ turn: bout.turn + 1, actor, text: outgoing + ' fez a tag. ' + incoming + ' entrou no ringue.' })
    actions[actor] = 'guard'
  }
  const result = resolveExchange({ ...duelView(bout), plan: actions.rival }, legalFighter(bout, 'player', lineup),
    legalFighter(bout, 'rival', lineup), actions.player, random, (defender, method) => {
      const corner = bout.tag[defender]
      const rescuer = apronSide(bout, defender)
      if (corner.saveUsed || rescuer.stamina < SAVE_STAMINA
        || (playerControlled && defender === 'player' && corner.partnerLegal && action !== 'save-partner')) return undefined
      rescuer.stamina -= SAVE_STAMINA
      corner.saveUsed = true
      const name = lineup[defender][corner.partnerLegal ? 0 : 1].name
      return name + (method === 'pinfall' ? ' interrompeu a contagem.' : ' desfez a submissão.')
    })

  for (const actor of CORNERS) {
    if (bout.tag[actor].partnerLegal) bout.tag[actor].partner = result[actor]
    else bout[actor] = result[actor]
    if (!result.finish) {
      const reserve = apronSide(bout, actor)
      reserve.stamina = clamp(reserve.stamina + 5, 0, 100)
    }
  }
  const next = { ...result, tag: bout.tag, player: bout.player, rival: bout.rival }
  next.used[next.turn - 1] = action
  if (!next.finish) next.plan = tagPlan(next, 'rival', lineup, difficulty, random)
  return next
}

export function playTagTurn(bout: TagBout, lineup: TagLineup, difficulty: Difficulty, action: string, random: Random): TagBout {
  const reason = tagActionUnavailable(bout, lineup.player[0], action)
  if (reason) throw new Error(reason)
  return exchangeTag(bout, lineup, difficulty, action, random, true)
}

export function simulateTag(show: Show, id: string, lineup: TagLineup, random: Random): TagBout {
  let bout = createTagBout(show, id, lineup, 'normal', random)
  while (!bout.finish) {
    const action = tagPlan(bout, 'player', lineup, 'normal', random)
    bout = exchangeTag(bout, lineup, 'normal', action, random, false)
  }
  return bout
}
