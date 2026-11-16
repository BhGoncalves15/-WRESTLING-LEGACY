import type { Fighter } from '../content/roster-model'
import { clamp, type Actor, type Bout, type BoutSide, type Difficulty, type DuelBout, type Show, type TagBout, type WrestlingTeam } from '../domain/model'
import { chooseAction, createBout, reasonUnavailable, resolveExchange } from './combat'
import type { Random } from './random'

export type TagLineup = Record<Actor, WrestlingTeam<Fighter>>
type TagCorner = TagBout['tag'][Actor]
type Slot = TagCorner['legalIndex']

export const TAG_ACTIONS = {
  tag: { name: 'Fazer a tag', description: 'Coloque seu parceiro no ringue e recupere stamina no apron.' },
  'ask-tag': { name: 'Pedir a tag', description: 'Peça a troca para voltar ao ringue.' },
  watch: { name: 'Acompanhar o turno', description: 'Seu parceiro decide a ação no ringue.' },
  'save-partner': { name: 'Salvar parceiro', description: 'Interrompa uma finalização do rival. Uma vez por equipe.' },
} as const

const TAG_STAMINA = 8
const SAVE_STAMINA = 14
const CORNERS = ['player', 'rival'] as const
const SLOTS = [0, 1, 2] as const
const ROTATIONS = ['tag-0', 'tag-1', 'tag-2'] as const

export function isTagBout(bout: Bout): bout is TagBout {
  return bout.tag !== undefined
}

export function cornerFighterIds(bout: DuelBout, actor: Actor, starterId: string): string[] {
  return [starterId, ...(bout.tag?.[actor].partners.map(partner => partner.id) ?? [])]
}

export function legalFighterId(bout: DuelBout, actor: Actor, starterId: string): string {
  return cornerFighterIds(bout, actor, starterId)[bout.tag?.[actor].legalIndex ?? 0]
}

export function cornerSide(bout: DuelBout, actor: Actor, slot = bout.tag?.[actor].legalIndex ?? 0): BoutSide {
  return slot === 0 ? bout[actor] : bout.tag![actor].partners[slot - 1].side
}

export function benchSlots(bout: TagBout, actor: Actor): Slot[] {
  const corner = bout.tag[actor]
  return SLOTS.filter(slot => slot <= corner.partners.length && slot !== corner.legalIndex)
}

export function tagActionFor(bout: TagBout, actor: Actor, slot: Slot) {
  return bout.tag[actor].partners.length === 1 ? 'tag' : ROTATIONS[slot]
}

export function tagTarget(bout: TagBout, actor: Actor, action: string): Slot | undefined {
  const corner = bout.tag[actor]
  if (corner.partners.length === 1) return action === 'tag' ? (corner.legalIndex === 0 ? 1 : 0) : undefined
  return SLOTS.find(slot => ROTATIONS[slot] === action)
}

export function tagSwapUnavailable(bout: TagBout, actor: Actor, target: Slot): string | null {
  const corner = bout.tag[actor]
  const outgoing = cornerSide(bout, actor)
  if (target === corner.legalIndex || target > corner.partners.length) return 'Escolha alguém que esteja no apron.'
  if (outgoing.position !== 'standing') return 'O lutador no ringue precisa estar em pé.'
  if (corner.lastTagTurn !== null && bout.turn - corner.lastTagTurn < 2) return 'Espere dois turnos entre trocas da mesma equipe.'
  if (outgoing.stamina < TAG_STAMINA || cornerSide(bout, actor, target).stamina < TAG_STAMINA) return 'A troca exige stamina dos dois lutadores.'
  return null
}

export function tagActionUnavailable(bout: TagBout, player: Fighter, action: string): string | null {
  if (bout.finish) return 'A luta terminou.'
  if (bout.tag.player.legalIndex === 0) {
    const target = tagTarget(bout, 'player', action)
    if (target !== undefined) return tagSwapUnavailable(bout, 'player', target)
    if (Object.hasOwn(TAG_ACTIONS, action)) return 'Esta ação é para quem está no apron.'
    return reasonUnavailable(duelView(bout), 'player', player, action, bout.plan)
  }
  if (action === 'watch') return null
  if (action === 'ask-tag') return tagSwapUnavailable(bout, 'player', 0)
  if (action === 'save-partner') {
    if (bout.tag.player.saveUsed) return 'Sua equipe já usou o salvamento.'
    if (bout.player.stamina < SAVE_STAMINA) return 'Você precisa de 14 de stamina.'
    return bout.plan === 'pin' || bout.plan === 'submit' ? null : 'Espere o rival preparar um pinfall ou uma submissão.'
  }
  return 'Seu parceiro está no ringue. Peça a tag para voltar.'
}

function legalFighter(bout: TagBout, actor: Actor, lineup: TagLineup): Fighter {
  return lineup[actor][bout.tag[actor].legalIndex]!
}

function duelView(bout: TagBout): TagBout {
  return { ...bout, player: cornerSide(bout, 'player'), rival: cornerSide(bout, 'rival') }
}

function tagPlan(bout: TagBout, actor: Actor, lineup: TagLineup, difficulty: Difficulty, random: Random, canSwap = true) {
  if (canSwap) {
    const active = cornerSide(bout, actor)
    const target = benchSlots(bout, actor).filter(slot => {
      const reserve = cornerSide(bout, actor, slot)
      return (active.condition + 18 < reserve.condition || active.stamina + 28 < reserve.stamina)
        && !tagSwapUnavailable(bout, actor, slot)
    }).sort((a, b) => {
      const first = cornerSide(bout, actor, a)
      const second = cornerSide(bout, actor, b)
      return (second.condition + second.stamina) - (first.condition + first.stamina)
    })[0]
    if (target !== undefined && random.next() < 0.55) return tagActionFor(bout, actor, target)
  }
  return chooseAction(duelView(bout), actor, legalFighter(bout, actor, lineup), difficulty, random)
}

export function createTagBout(show: Show, id: string, lineup: TagLineup, difficulty: Difficulty, random: Random): TagBout {
  if (lineup.player.length !== lineup.rival.length) throw new Error('As duas equipes precisam ter o mesmo número de lutadores.')
  const division = lineup.player[0].division
  const mixed = lineup.player.length === 2 && lineup.player[1].division !== division
  if (lineup.rival[0].division !== division || (mixed
    ? lineup.rival[1].division !== lineup.player[1].division
    : CORNERS.some(actor => lineup[actor].some(fighter => fighter.division !== division)))) {
    throw new Error('A formação não corresponde à divisão da luta.')
  }
  const bout = createBout(show, id, lineup.rival[0], difficulty, random)
  const corner = (actor: Actor): TagCorner => {
    const [, second, third] = lineup[actor]
    const partner = (fighter: Fighter) => ({ id: fighter.id, side: { ...bout[actor] } })
    return { partners: third ? [partner(second), partner(third)] : [partner(second)], legalIndex: 0, lastTagTurn: null, saveUsed: false }
  }
  return { ...bout, tag: { player: corner('player'), rival: corner('rival'), ...(mixed ? { mixed: true } : {}) } }
}

function copyCorner(corner: TagCorner): TagCorner {
  const [first, second] = corner.partners
  const copy = (partner: typeof first) => ({ ...partner, side: { ...partner.side } })
  return { ...corner, partners: second ? [copy(first), copy(second)] : [copy(first)] }
}

function exchangeTag(
  source: TagBout, lineup: TagLineup, difficulty: Difficulty, action: string, random: Random, playerControlled: boolean,
): TagBout {
  const bout: TagBout = {
    ...source, player: { ...source.player }, rival: { ...source.rival }, log: [...source.log],
    tag: { ...source.tag, player: copyCorner(source.tag.player), rival: copyCorner(source.tag.rival) },
  }
  const playerAction = action === 'watch' || action === 'save-partner'
    ? tagPlan(source, 'player', lineup, difficulty, random, action === 'watch') : action
  const actions = { player: playerAction, rival: source.plan }
  const selected = {
    player: playerAction === 'ask-tag' ? 0 as const : tagTarget(source, 'player', playerAction),
    rival: tagTarget(source, 'rival', source.plan),
  }
  const mirrored = bout.tag.mixed && (selected.player !== undefined || selected.rival !== undefined)

  for (const actor of CORNERS) {
    const requested = selected[actor]
    const target = requested ?? (mirrored ? (bout.tag[actor].legalIndex === 0 ? 1 : 0) : undefined)
    if (target === undefined) continue
    const outgoing = legalFighter(bout, actor, lineup).name
    const side = cornerSide(bout, actor)
    if (requested !== undefined) side.stamina -= TAG_STAMINA
    else side.position = 'standing'
    bout.tag[actor].legalIndex = target
    bout.tag[actor].lastTagTurn = bout.turn + 1
    const incoming = legalFighter(bout, actor, lineup).name
    bout.log.push({ turn: bout.turn + 1, actor, text: requested === undefined
      ? incoming + ' entrou após a tag da outra dupla.'
      : outgoing + ' fez a tag. ' + incoming + ' entrou no ringue.' })
    actions[actor] = 'guard'
  }
  const result = resolveExchange({ ...duelView(bout), plan: actions.rival }, legalFighter(bout, 'player', lineup),
    legalFighter(bout, 'rival', lineup), actions.player, random, (defender, method) => {
      const corner = bout.tag[defender]
      if (corner.saveUsed) return undefined
      const eligible = benchSlots(bout, defender).filter(slot => cornerSide(bout, defender, slot).stamina >= SAVE_STAMINA)
      const manual = playerControlled && defender === 'player'
      const rescuer = manual && action === 'save-partner'
        ? eligible.find(slot => slot === 0)
        : eligible.find(slot => !manual || slot !== 0)
      if (rescuer === undefined) return undefined
      cornerSide(bout, defender, rescuer).stamina -= SAVE_STAMINA
      corner.saveUsed = true
      const name = lineup[defender][rescuer]!.name
      return name + (method === 'pinfall' ? ' interrompeu a contagem.' : ' desfez a submissão.')
    })

  for (const actor of CORNERS) {
    const { legalIndex, partners } = bout.tag[actor]
    if (legalIndex === 0) bout[actor] = result[actor]
    else partners[legalIndex - 1].side = result[actor]
    if (!result.finish) {
      for (const slot of benchSlots(bout, actor)) {
        const reserve = cornerSide(bout, actor, slot)
        reserve.stamina = clamp(reserve.stamina + 5, 0, 100)
      }
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
