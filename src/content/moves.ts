import { MOVE_KINDS, MOVE_SLOTS, type Attribute, type MoveKind, type Style } from '../domain/model'

export type Move = {
  id: string
  name: string
  kind: MoveKind
  impact: number
  cost: number
  knockdown?: boolean
  topRope?: boolean
  counters?: readonly MoveKind[]
  unlock?: { attribute: Attribute; minimum: number; xp: number }
}

export const MOVES: readonly Move[] = [
  { id: 'jab', name: 'Jab', kind: 'quick', impact: 9, cost: 4 },
  { id: 'chop', name: 'Knife-edge Chop', kind: 'quick', impact: 11, cost: 6 },
  { id: 'kick', name: 'Low Kick', kind: 'quick', impact: 10, cost: 5 },
  { id: 'dropkick', name: 'Dropkick', kind: 'quick', impact: 13, cost: 8, knockdown: true },
  { id: 'european', name: 'European Uppercut', kind: 'quick', impact: 12, cost: 7 },
  { id: 'clothesline', name: 'Clothesline', kind: 'heavy', impact: 17, cost: 10, knockdown: true },
  { id: 'suplex', name: 'Vertical Suplex', kind: 'heavy', impact: 19, cost: 13, knockdown: true },
  { id: 'slam', name: 'Body Slam', kind: 'heavy', impact: 17, cost: 11, knockdown: true },
  { id: 'powerslam', name: 'Powerslam', kind: 'heavy', impact: 22, cost: 16, knockdown: true },
  { id: 'forearm', name: 'Running Forearm', kind: 'heavy', impact: 18, cost: 11 },
  { id: 'armdrag', name: 'Arm Drag', kind: 'technical', impact: 12, cost: 7, knockdown: true },
  { id: 'snapmare', name: 'Snapmare', kind: 'technical', impact: 13, cost: 8, knockdown: true },
  { id: 'leglock', name: 'Kneebar', kind: 'technical', impact: 15, cost: 10 },
  { id: 'backbreaker', name: 'Backbreaker', kind: 'technical', impact: 18, cost: 12, knockdown: true },
  { id: 'crossbody', name: 'Diving Crossbody', kind: 'aerial', impact: 20, cost: 13, topRope: true, knockdown: true },
  { id: 'moonsault', name: 'Moonsault', kind: 'aerial', impact: 23, cost: 16, topRope: true, knockdown: true },
  { id: 'elbow', name: 'Diving Elbow Drop', kind: 'aerial', impact: 24, cost: 18, topRope: true, knockdown: true },
  { id: 'duck', name: 'Esquiva e cotovelada', kind: 'counter', impact: 13, cost: 7, counters: ['quick', 'aerial'] },
  { id: 'backdrop', name: 'Back Body Drop', kind: 'counter', impact: 17, cost: 11, knockdown: true, counters: ['heavy', 'finisher'] },
  { id: 'wristlock', name: 'Reversão de pulso', kind: 'counter', impact: 13, cost: 8, counters: ['technical', 'signature'] },
  { id: 'rollthrough', name: 'Roll-through', kind: 'counter', impact: 14, cost: 9, knockdown: true, counters: ['aerial', 'signature'] },
  { id: 'enzuigiri', name: 'Enzuigiri', kind: 'signature', impact: 24, cost: 13, knockdown: true },
  { id: 'ddt', name: 'Spinning DDT', kind: 'signature', impact: 26, cost: 15, knockdown: true },
  { id: 'spinebuster', name: 'Spinebuster', kind: 'signature', impact: 29, cost: 17, knockdown: true },
  { id: 'german', name: 'Bridging German Suplex', kind: 'signature', impact: 26, cost: 15, knockdown: true },
  { id: 'splash', name: 'Frog Splash', kind: 'finisher', impact: 36, cost: 20, topRope: true, knockdown: true },
  { id: 'cutter', name: 'Jumping Cutter', kind: 'finisher', impact: 32, cost: 17, knockdown: true },
  { id: 'powerbomb', name: 'Sit-out Powerbomb', kind: 'finisher', impact: 38, cost: 21, knockdown: true },
  { id: 'driver', name: 'Samoan Driver', kind: 'finisher', impact: 34, cost: 18, knockdown: true },
  { id: 'spear', name: 'Spear', kind: 'finisher', impact: 35, cost: 18, knockdown: true, unlock: { attribute: 'strength', minimum: 65, xp: 40 } },
]

export const MOVE_BY_ID = new Map(MOVES.map(move => [move.id, move]))

const allRounder = ['jab', 'chop', 'kick', 'dropkick', 'clothesline', 'suplex', 'slam', 'forearm',
  'armdrag', 'snapmare', 'leglock', 'crossbody', 'moonsault', 'duck', 'backdrop', 'wristlock',
  'enzuigiri', 'ddt', 'cutter', 'driver']

export function defaultMoves(style: Style): string[] {
  const swaps: Partial<Record<Style, Record<string, string>>> = {
    Highflyer: { driver: 'splash', wristlock: 'rollthrough' },
    Powerhouse: { forearm: 'powerslam', enzuigiri: 'spinebuster', cutter: 'powerbomb', moonsault: 'elbow' },
    Technician: { kick: 'european', enzuigiri: 'german', snapmare: 'backbreaker' },
    Brawler: { kick: 'european', slam: 'powerslam', enzuigiri: 'spinebuster', cutter: 'powerbomb' },
    'Submission Specialist': { snapmare: 'backbreaker', enzuigiri: 'german' },
  }
  return allRounder.map(id => swaps[style]?.[id] ?? id)
}

export function validMoveset(ids: readonly string[]): boolean {
  if (ids.length !== 20 || new Set(ids).size !== ids.length) return false
  return MOVE_KINDS.every(kind => ids.filter(id => MOVE_BY_ID.get(id)?.kind === kind).length === MOVE_SLOTS[kind])
}

export function swapMove(ids: readonly string[], addId: string, removeId: string) {
  const add = MOVE_BY_ID.get(addId)
  if (!add || ids.includes(addId) || !ids.includes(removeId) || MOVE_BY_ID.get(removeId)?.kind !== add.kind) {
    throw new Error('Escolha um golpe da mesma categoria para substituir.')
  }
  return ids.map(id => id === removeId ? addId : id)
}
