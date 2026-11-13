import { MOVE_BY_ID, type Move } from '../content/moves'
import type { Fighter } from '../content/catalog'
import { clamp, type Actor, type Attribute, type BoutSide, type Difficulty, type DuelBout, type Method, type Show, type TurnLog } from '../domain/model'
import { Random } from './random'

export const SIGNATURE_MOMENTUM = 38
export const FINISHER_MOMENTUM = 66

const SETUP = {
  guard: { name: 'Fechar a guarda', description: 'Protege contra o próximo ataque deste turno.' },
  breathe: { name: 'Recuperar o fôlego', description: 'Recupera stamina. Se estiver no chão, volta à luta em pé.' },
  climb: { name: 'Subir no corner', description: 'Prepara golpes aéreos e finishers da terceira corda.' },
  pin: { name: 'Buscar o pinfall', description: 'Tenta a contagem de três sobre o rival no chão.' },
  submit: { name: 'Aplicar submissão', description: 'Tenta fazer o rival desistir. Técnica e desgaste ajudam.' },
} as const

export const TACTICAL_ACTIONS = Object.keys(SETUP) as (keyof typeof SETUP)[]
export const validAction = (action: string) => MOVE_BY_ID.has(action) || TACTICAL_ACTIONS.some(id => id === action)

const positionLabel: Record<BoutSide['position'], string> = { standing: 'Em pé', grounded: 'No chão', corner: 'No corner' }
export const positionName = (position: BoutSide['position']) => positionLabel[position]

export function actionName(action: string): string {
  return MOVE_BY_ID.get(action)?.name ?? SETUP[action as keyof typeof SETUP]?.name ?? action
}

export function actionDescription(action: string): string {
  const move = MOVE_BY_ID.get(action)
  if (!move) return SETUP[action as keyof typeof SETUP]?.description ?? ''
  const types = { quick: 'rápidos', heavy: 'fortes', technical: 'técnicos', aerial: 'aéreos', counter: 'reversões', signature: 'signatures', finisher: 'finishers' }
  if (move.counters) return 'Reverte golpes ' + move.counters.map(kind => types[kind]).join(' ou ') + '.'
  const parts = [move.cost + ' de stamina']
  if (move.topRope) parts.push('exige o corner')
  if (move.kind === 'signature') parts.push(SIGNATURE_MOMENTUM + ' de momentum')
  if (move.kind === 'finisher') parts.push(FINISHER_MOMENTUM + ' de momentum')
  return parts.join(' · ')
}

export function telegraph(action: string): string {
  const kind = MOVE_BY_ID.get(action)?.kind
  if (kind) return {
    quick: 'prepara um golpe rápido', heavy: 'prepara um golpe forte', technical: 'procura uma abertura técnica',
    aerial: 'mira um ataque aéreo', counter: 'espera uma abertura para reverter',
    signature: 'prepara uma signature', finisher: 'procura encaixar seu finisher',
  }[kind]
  return {
    guard: 'fecha a guarda', breathe: 'tenta recuperar o fôlego', climb: 'olha para o corner',
    pin: 'tenta preparar a contagem', submit: 'procura uma submissão',
  }[action] ?? 'espera uma abertura'
}

const other = (actor: Actor): Actor => actor === 'player' ? 'rival' : 'player'
export const initialSide = (): BoutSide => ({ condition: 100, stamina: 100, momentum: 8, position: 'standing' })

function moveCost(move: Move, fighter: Fighter) {
  const proficiency = fighter.moveLevels[move.id] ?? 0
  return Math.max(2, move.cost - proficiency)
}

export function reasonUnavailable(
  bout: DuelBout, actor: Actor, fighter: Fighter, action: string, enemyPlan?: string,
): string | null {
  if (bout.finish) return 'A luta terminou.'
  return fighterActionIssue(bout[actor], bout[other(actor)], fighter, action, enemyPlan)
}

export function fighterActionIssue(side: BoutSide, target: BoutSide, fighter: Fighter, action: string, enemyPlan?: string): string | null {
  if (action === 'guard' || action === 'breathe') return null
  if (side.position === 'grounded') return 'Recupere o fôlego para levantar.'
  if (action === 'climb') return side.position !== 'standing' ? 'Você já está no corner.' : side.stamina < 8 ? 'Precisa de 8 de stamina.' : null
  if (action === 'pin' || action === 'submit') {
    if (side.position !== 'standing') return 'Desça do corner primeiro.'
    if (target.position !== 'grounded') return 'Derrube o rival para tentar a finalização.'
    return side.stamina < (action === 'pin' ? 3 : 8) ? 'Stamina insuficiente.' : null
  }
  const move = MOVE_BY_ID.get(action)
  if (!move || !fighter.moves.includes(action)) return 'Golpe fora do moveset.'
  if (side.stamina < moveCost(move, fighter)) return 'Stamina insuficiente.'
  if (move.topRope && side.position !== 'corner') return 'Suba no corner para preparar este golpe.'
  if (!move.topRope && side.position === 'corner') return 'Use um golpe aéreo ou recupere o fôlego para descer.'
  if (move.kind === 'signature' && side.momentum < SIGNATURE_MOMENTUM) return 'Precisa de mais momentum.'
  if (move.kind === 'finisher' && side.momentum < FINISHER_MOMENTUM) return 'Precisa de mais momentum.'
  if (move.counters && enemyPlan !== undefined) {
    const incoming = MOVE_BY_ID.get(enemyPlan)
    if (!incoming || !move.counters.includes(incoming.kind)) return 'A leitura do rival indica outro tipo de ação.'
  }
  return null
}

export const controlAttribute: Record<Move['kind'], Attribute> = {
  quick: 'agility', heavy: 'strength', technical: 'technique', aerial: 'agility',
  counter: 'defense', signature: 'psychology', finisher: 'finishing',
}

export function chooseAction(bout: DuelBout, actor: Actor, fighter: Fighter, difficulty: Difficulty, random: Random): string {
  return chooseFighterAction(bout[actor], bout[other(actor)], fighter, difficulty, random, actor === 'rival' ? bout.used.at(-1) : undefined)
}

export function chooseFighterAction(side: BoutSide, opponent: BoutSide, fighter: Fighter, difficulty: Difficulty, random: Random, predicted?: string): string {
  const choices = [...fighter.moves, ...TACTICAL_ACTIONS].filter(action => (
    !fighterActionIssue(side, opponent, fighter, action, predicted)
  ))
  const tactical = difficulty === 'hard' ? 1.45 : difficulty === 'easy' ? 0.55 : 1
  return random.weighted(choices, action => {
    if (action === 'breathe') return side.position === 'grounded' ? 35 : side.stamina < 22 ? 19 * tactical : 0.8
    if (action === 'guard') return side.position === 'grounded' ? 0.8 : 1.3
    if (action === 'climb') return fighter.style === 'Highflyer' && side.stamina > 24 ? 3 : 0.45
    if (action === 'pin') return opponent.condition <= 10 ? 90 * tactical : opponent.condition < 44 ? 21 * tactical : 1.5
    if (action === 'submit') return opponent.condition <= 10 ? 78 * tactical : opponent.condition < 48 ? (fighter.style === 'Submission Specialist' ? 30 : 12) * tactical : 0.8
    const move = MOVE_BY_ID.get(action)!
    if (move.counters) return predicted ? 4 * tactical : 0.5
    const skill = fighter.attributes[controlAttribute[move.kind]]
    const power = (move.impact - 4) / 6
    const finisher = move.kind === 'finisher' || move.kind === 'signature'
    return (power + (finisher ? 3 * tactical : 0)) * (0.6 + skill / 120) * (side.stamina < 28 ? 1.3 - move.cost / 26 : 1)
  })
}

export function createBout(show: Show, id: string, rival: Fighter, difficulty: Difficulty, random: Random): DuelBout {
  const bout: DuelBout = {
    id, showId: show.id, rivalId: rival.id, player: initialSide(), rival: initialSide(), turn: 0,
    plan: 'guard', log: [], used: [], finish: null, xpAwarded: 0,
  }
  bout.plan = chooseAction(bout, 'rival', rival, difficulty, random)
  return bout
}

const tempo: Record<Move['kind'], number> = { quick: 37, heavy: 13, technical: 24, aerial: 24, counter: 65, signature: 28, finisher: 27 }
const setupTempo: Record<string, number> = { guard: 80, breathe: 21, climb: 18, pin: 53, submit: 52 }

export function actionInitiative(fighter: Fighter, action: string, random: Random): number {
  const move = MOVE_BY_ID.get(action)
  return (move ? tempo[move.kind] : setupTempo[action]) + fighter.attributes.agility / 5 + random.next() * 12
}

function finishChance(side: BoutSide, target: BoutSide, fighter: Fighter, enemy: Fighter, method: Method): number {
  if (target.condition === 0) return 1
  const skill = method === 'submission' ? fighter.attributes.technique * 0.6 + fighter.attributes.finishing * 0.4 : fighter.attributes.finishing
  return clamp(
    0.07 + (100 - target.condition) * 0.0088 + (100 - target.stamina) * 0.0015 + side.momentum * 0.0011
      + (skill - enemy.attributes.defense) * 0.0025,
    0.03, 0.96,
  )
}

export type Combatant = { fighter: Fighter; side: BoutSide }

type ActionEffect = { text: string; referee?: true; guarding?: true; interrupts?: true } | { fall: Method }

export function recoverStamina({ side, fighter }: Combatant) {
  side.stamina = clamp(side.stamina + 2 + fighter.attributes.stamina / 20, 0, 100)
}

export function escapeFinish(target: BoutSide) {
  target.position = 'standing'
  target.stamina = clamp(target.stamina - 6, 0, 100)
  target.momentum = clamp(target.momentum + 6, 0, 100)
}

export function announceFall(fighter: Fighter, defeated: Fighter, method: Method) {
  return method === 'pinfall' ? 'Um, dois, três! ' + fighter.name + ' vence por pinfall.'
    : defeated.name + ' bateu. ' + fighter.name + ' vence por submissão.'
}

export function resolveFighterAction(
  { side, fighter }: Combatant, { side: target, fighter: enemy }: Combatant,
  action: string, incoming: string, cover: boolean, random: Random,
): ActionEffect {
  if (fighterActionIssue(side, target, fighter, action, incoming)) {
    return { text: fighter.name + ' perdeu a abertura para ' + actionName(action).toLowerCase() + '.' }
  }
  if (action === 'guard') {
    side.stamina = clamp(side.stamina + 4, 0, 100)
    return { text: fighter.name + ' fechou a guarda.', guarding: true }
  }
  if (action === 'breathe') {
    const wasGrounded = side.position === 'grounded'
    const wasInCorner = side.position === 'corner'
    side.position = 'standing'
    side.stamina = clamp(side.stamina + 13 + fighter.attributes.stamina / 9, 0, 100)
    side.momentum = clamp(side.momentum + 3, 0, 100)
    return { text: fighter.name + (wasGrounded ? ' se levantou e recuperou o fôlego.'
      : wasInCorner ? ' desceu do corner e recuperou o fôlego.' : ' recuperou o fôlego.') }
  }
  if (action === 'climb') {
    side.position = 'corner'
    side.stamina -= 8
    return { text: fighter.name + ' subiu no corner.' }
  }
  if (action === 'pin' || action === 'submit') {
    const method = action === 'pin' ? 'pinfall' : 'submission'
    side.stamina -= action === 'pin' ? 3 : 8
    if (random.next() < finishChance(side, target, fighter, enemy, method)) return { fall: method }
    escapeFinish(target)
    return { referee: true, text: method === 'pinfall' ? enemy.name + ' escapou da contagem antes do três.' : enemy.name + ' escapou da chave.' }
  }

  const move = MOVE_BY_ID.get(action)!
  const skill = fighter.attributes[controlAttribute[move.kind]]
  const level = fighter.moveLevels[move.id] ?? 0
  const tired = side.stamina < 30 ? (30 - side.stamina) * 0.006 : 0
  const base = move.kind === 'counter' ? 0.72 : move.topRope ? 0.76 : 0.9
  side.stamina -= moveCost(move, fighter)
  side.position = 'standing'
  if (move.kind === 'signature') side.momentum -= SIGNATURE_MOMENTUM
  if (move.kind === 'finisher') side.momentum -= FINISHER_MOMENTUM
  const chance = clamp(base + (skill - enemy.attributes.defense) * 0.004 + level * 0.02 - tired - (cover ? 0.11 : 0), 0.32, 0.98)
  if (random.next() >= chance) {
    side.momentum = clamp(side.momentum - 6, 0, 100)
    return { text: enemy.name + ' evitou ' + move.name + ' de ' + fighter.name + '.' }
  }

  const raw = move.impact * (0.78 + skill / 210) + (random.next() * 4 - 2) + level * 1.5
  const damage = Math.max(2, Math.round((raw - (enemy.attributes.endurance - 50) * 0.12) * (cover ? 0.54 : 1)))
  target.condition = clamp(target.condition - damage, 0, 100)
  target.stamina = clamp(target.stamina - Math.floor(damage / 4), 0, 100)
  target.momentum = clamp(target.momentum - 5, 0, 100)
  side.momentum = clamp(side.momentum + (move.counters ? 19 : move.kind === 'quick' ? 12 : 16), 0, 100)
  const drops = target.condition === 0 || (!cover && move.knockdown && (target.condition <= 64 || move.kind === 'counter' || move.kind === 'aerial' || random.next() < 0.32))
  if (drops) target.position = 'grounded'
  else if (target.position === 'corner') target.position = 'standing'
  return {
    text: fighter.name + ' acertou ' + move.name + (drops ? ' e derrubou ' + enemy.name + '.' : ' em ' + enemy.name + '.'),
    ...(move.counters ? { interrupts: true as const } : {}),
  }
}

export function resolveExchange(
  source: DuelBout, player: Fighter, rival: Fighter, playerAction: string, random: Random,
  saveFromFinish?: (defender: Actor, method: Method) => string | undefined,
): DuelBout {
  const turn = source.turn + 1
  const bout: DuelBout = {
    ...source, turn, player: { ...source.player }, rival: { ...source.rival },
    log: [...source.log], used: [...source.used, playerAction],
  }
  const actors = { player: { fighter: player, side: bout.player }, rival: { fighter: rival, side: bout.rival } }
  const actions = { player: playerAction, rival: source.plan }
  const guarded = new Set<Actor>()
  const interrupted = new Set<Actor>()
  const log = (actor: TurnLog['actor'], text: string) => bout.log.push({ turn, actor, text })
  const order: Actor[] = actionInitiative(player, playerAction, random) >= actionInitiative(rival, source.plan, random)
    ? ['player', 'rival'] : ['rival', 'player']

  for (const actor of order) {
    if (bout.finish || interrupted.has(actor)) continue
    const enemy = other(actor)
    const result = resolveFighterAction(actors[actor], actors[enemy], actions[actor], actions[enemy], guarded.has(enemy), random)
    if ('fall' in result) {
      const save = saveFromFinish?.(enemy, result.fall)
      if (save) {
        log('referee', save)
        escapeFinish(bout[enemy])
      } else {
        bout.finish = { winner: actor, method: result.fall }
        log('referee', announceFall(actors[actor].fighter, actors[enemy].fighter, result.fall))
      }
    } else {
      if (result.guarding) guarded.add(actor)
      if (result.interrupts) interrupted.add(enemy)
      log(result.referee ? 'referee' : actor, result.text)
    }
  }

  if (!bout.finish) for (const actor of order) recoverStamina(actors[actor])
  return bout
}

function nextExchange(
  source: DuelBout, player: Fighter, rival: Fighter, difficulty: Difficulty, action: string, random: Random,
): DuelBout {
  const bout = resolveExchange(source, player, rival, action, random)
  if (!bout.finish) bout.plan = chooseAction(bout, 'rival', rival, difficulty, random)
  return bout
}

export function playTurn(bout: DuelBout, player: Fighter, rival: Fighter, difficulty: Difficulty, action: string, random: Random): DuelBout {
  const reason = reasonUnavailable(bout, 'player', player, action, bout.plan)
  if (reason) throw new Error(reason)
  return nextExchange(bout, player, rival, difficulty, action, random)
}

export function simulateSingles(show: Show, id: string, first: Fighter, second: Fighter, random: Random): DuelBout {
  let bout = createBout(show, id, second, 'normal', random)
  while (!bout.finish) {
    const action = chooseAction(bout, 'player', first, 'normal', random)
    bout = nextExchange(bout, first, second, 'normal', action, random)
  }
  return bout
}
