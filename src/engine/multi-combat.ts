import type { Fighter } from '../content/roster-model'
import { clamp, type BoutSide, type Difficulty, type Fall, type MultiBout, type Show } from '../domain/model'
import {
  actionInitiative, announceFall, chooseFighterAction, escapeFinish, fighterActionIssue, initialSide,
  recoverStamina, resolveFighterAction, type Combatant,
} from './combat'
import type { Random } from './random'

export const BREAKUP_STAMINA = 12
export const canBreakFall = (side: BoutSide) => side.position === 'standing' && side.stamina >= BREAKUP_STAMINA && side.condition > 0

type Plan = { targetId: string; action: string }

function participants(bout: MultiBout, fighters: readonly Fighter[]): Combatant[] {
  return [{ fighter: fighters[0], side: bout.player }, ...bout.multi.opponents.map((entry, index) => ({ fighter: fighters[index + 1], side: entry.side }))]
}

function copyBout(bout: MultiBout): MultiBout {
  return {
    ...bout, player: { ...bout.player }, log: [...bout.log],
    multi: { ...bout.multi, opponents: bout.multi.opponents.map(entry => ({ ...entry, side: { ...entry.side } })) },
  }
}

function choosePlan(actor: Combatant, lineup: readonly Combatant[], difficulty: Difficulty, random: Random): Plan {
  const target = random.weighted(lineup.filter(contender => contender !== actor), ({ side }) => (
    1 + (100 - side.condition) / 38 + (side.position === 'grounded' && side.condition < 55 ? 3 : 0)
  ))
  return {
    targetId: target.fighter.id,
    action: chooseFighterAction(actor.side, target.side, actor.fighter, difficulty, random),
  }
}

function refreshPlans(bout: MultiBout, fighters: readonly Fighter[], difficulty: Difficulty, random: Random) {
  const lineup = participants(bout, fighters)
  for (const [index, opponent] of bout.multi.opponents.entries()) {
    Object.assign(opponent, choosePlan(lineup[index + 1], lineup, difficulty, random))
  }
}

export function createMultiBout(show: Show, id: string, fighters: readonly Fighter[], difficulty: Difficulty, random: Random): MultiBout {
  if (fighters.length < 3 || fighters.length > 4 || new Set(fighters.map(fighter => fighter.id)).size !== fighters.length
    || fighters.some(fighter => fighter.division !== fighters[0].division)) {
    throw new Error('Escale três ou quatro lutadores diferentes da mesma divisão.')
  }
  const bout: MultiBout = {
    id, showId: show.id, player: initialSide(), turn: 0, log: [], used: [], finish: null, xpAwarded: 0,
    multi: {
      targetId: fighters[1].id, pendingFall: null,
      opponents: fighters.slice(1).map(fighter => ({ id: fighter.id, side: initialSide(), action: 'guard', targetId: fighters[0].id })),
    },
  }
  refreshPlans(bout, fighters, difficulty, random)
  return bout
}

export function multiActionIssue(bout: MultiBout, player: Fighter, action: string): string | null {
  if (bout.finish) return 'A luta terminou.'
  if (bout.multi.pendingFall) {
    if (action === 'allow-fall') return null
    if (action === 'break-up') return canBreakFall(bout.player) ? null : 'A interrupção exige estar em pé e ter 12 de stamina.'
    return 'Resolva a tentativa de finalização para continuar.'
  }
  const target = bout.multi.opponents.find(entry => entry.id === bout.multi.targetId)!
  return fighterActionIssue(bout.player, target.side, player, action, target.targetId === player.id ? target.action : 'guard')
}

function referee(bout: MultiBout, text: string) {
  bout.log.push({ turn: bout.turn, actor: 'referee', text })
}

function closeFall(bout: MultiBout, fall: Fall, attacker: Combatant, defender: Combatant) {
  bout.finish = fall
  referee(bout, announceFall(attacker.fighter, defender.fighter, fall.method))
}

function breakFall(bout: MultiBout, breaker: Combatant, attacker: Combatant, defender: Combatant, fall: Fall) {
  breaker.side.stamina -= BREAKUP_STAMINA
  breaker.side.momentum = clamp(breaker.side.momentum + 8, 0, 100)
  attacker.side.position = 'grounded'
  escapeFinish(defender.side)
  referee(bout, breaker.fighter.name + (fall.method === 'pinfall' ? ' interrompeu a contagem de ' : ' desfez a submissão de ') + attacker.fighter.name + '.')
}

function settleAttempt(bout: MultiBout, fall: Fall, attacker: Combatant, defender: Combatant, lineup: readonly Combatant[], random: Random, interactive: boolean) {
  const player = interactive ? lineup[0] : undefined
  const breaker = lineup.filter(actor => actor !== player && actor !== attacker && actor !== defender && canBreakFall(actor.side))
    .sort((a, b) => b.side.stamina - a.side.stamina || b.fighter.attributes.agility - a.fighter.attributes.agility)[0]
  if (breaker && random.next() < 0.32 + breaker.side.condition * 0.0023 + breaker.side.stamina * 0.002) {
    breakFall(bout, breaker, attacker, defender, fall)
  } else if (player && player !== attacker && player !== defender && canBreakFall(player.side)) {
    bout.multi.pendingFall = fall
    referee(bout, attacker.fighter.name + (fall.method === 'pinfall' ? ' está perto do três sobre ' : ' está perto de finalizar ') + defender.fighter.name + '.')
  } else closeFall(bout, fall, attacker, defender)
}

function prepareNextTurn(bout: MultiBout, lineup: readonly Combatant[], fighters: readonly Fighter[], difficulty: Difficulty, random: Random) {
  if (bout.finish || bout.multi.pendingFall) return
  for (const actor of lineup) recoverStamina(actor)
  refreshPlans(bout, fighters, difficulty, random)
}

function exchange(source: MultiBout, fighters: readonly Fighter[], difficulty: Difficulty, playerPlan: Plan, random: Random, interactive: boolean): MultiBout {
  const bout = copyBout(source)
  bout.turn++
  bout.used = [...source.used, playerPlan.action]
  bout.multi.targetId = playerPlan.targetId
  const lineup = participants(bout, fighters)
  const plans = [playerPlan, ...bout.multi.opponents]
  const order = lineup.map((actor, index) => ({
    actor, plan: plans[index], speed: actionInitiative(actor.fighter, plans[index].action, random),
  })).sort((a, b) => b.speed - a.speed)
  const guarded = new Set<Combatant>()
  const interrupted = new Set<Combatant>()
  for (const { actor, plan } of order) {
    if (interrupted.has(actor)) continue
    const enemy = order.find(entry => entry.actor.fighter.id === plan.targetId)!
    const incoming = enemy.plan.targetId === actor.fighter.id && !interrupted.has(enemy.actor) ? enemy.plan.action : 'guard'
    const effect = resolveFighterAction(actor, enemy.actor, plan.action, incoming, guarded.has(enemy.actor), random)
    if ('fall' in effect) {
      settleAttempt(bout, { winnerId: actor.fighter.id, defeatedId: enemy.actor.fighter.id, method: effect.fall },
        actor, enemy.actor, lineup, random, interactive)
      break
    }
    if (effect.guarding) guarded.add(actor)
    if (effect.interrupts) interrupted.add(enemy.actor)
    bout.log.push({ turn: bout.turn, actor: effect.referee ? 'referee' : actor === lineup[0] ? 'player' : 'rival', text: effect.text })
  }
  prepareNextTurn(bout, lineup, fighters, difficulty, random)
  return bout
}

export function playMultiTurn(source: MultiBout, fighters: readonly Fighter[], difficulty: Difficulty, action: string, random: Random): MultiBout {
  const issue = multiActionIssue(source, fighters[0], action)
  if (issue) throw new Error(issue)
  const fall = source.multi.pendingFall
  if (!fall) return exchange(source, fighters, difficulty, { action, targetId: source.multi.targetId }, random, true)

  const bout = copyBout(source)
  bout.multi.pendingFall = null
  const lineup = participants(bout, fighters)
  const attacker = lineup.find(actor => actor.fighter.id === fall.winnerId)!
  const defender = lineup.find(actor => actor.fighter.id === fall.defeatedId)!
  if (action === 'break-up') breakFall(bout, lineup[0], attacker, defender, fall)
  else closeFall(bout, fall, attacker, defender)
  prepareNextTurn(bout, lineup, fighters, difficulty, random)
  return bout
}

export function simulateMulti(show: Show, id: string, fighters: readonly Fighter[], random: Random): MultiBout {
  let bout = createMultiBout(show, id, fighters, 'normal', random)
  while (!bout.finish) {
    const lineup = participants(bout, fighters)
    bout = exchange(bout, fighters, 'normal', choosePlan(lineup[0], lineup, 'normal', random), random, false)
  }
  return bout
}
