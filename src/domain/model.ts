import { z } from 'zod'

export const START_DATE = '2026-01-01'
export const LEGACY_DATA_VERSION = 'pilot-2026-01-01.1'
export const WORLD_DATA_VERSION = 'world-2026-01-01.2'
export const TAG_DATA_VERSION = 'world-2026-01-01.3'
export const TRIOS_DATA_VERSION = 'world-2026-01-01.4'
export const DATA_VERSION = 'world-2026-01-01.5'
export const SAVE_VERSION = 5
export const INITIAL_ATTRIBUTE = 40
export const INITIAL_BUDGET = 180
export const INITIAL_LIMIT = 90
export const ATTRIBUTE_CAP = 100

export const ATTRIBUTE_NAMES = {
  strength: 'Força',
  agility: 'Agilidade',
  technique: 'Técnica',
  endurance: 'Resistência',
  stamina: 'Stamina',
  charisma: 'Carisma',
  psychology: 'Psicologia',
  finishing: 'Finalização',
  defense: 'Defesa',
} as const
export type Attribute = keyof typeof ATTRIBUTE_NAMES
export const ATTRIBUTES = Object.keys(ATTRIBUTE_NAMES) as Attribute[]

export const STYLES = ['Highflyer', 'Powerhouse', 'Technician', 'Brawler', 'Submission Specialist', 'All-Rounder'] as const
export const ALIGNMENTS = ['Face', 'Heel', 'Tweener'] as const
export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const
export const DIVISIONS = ['men', 'women'] as const
export const COMPANIES = ['wwe', 'aew', 'njpw', 'tna', 'aaa', 'roh', 'bwf'] as const
export const PROMOTIONS = ['raw', 'smackdown', 'nxt', 'aew', 'njpw', 'tna', 'aaa', 'roh', 'bwf'] as const
export const TEAM_FORMATS = ['tag', 'trios', 'mixed'] as const
export const MATCH_FORMATS = ['singles', ...TEAM_FORMATS] as const
export const TEAM_SIZE = { tag: 2, trios: 3, mixed: 2 } as const
export const MATCH_FORMAT_LABEL = { singles: 'Singles', tag: 'Tag Team', trios: 'Trios', mixed: 'Duplas mistas' } as const
export const MIN_RING_WEIGHT_KG = 35
export const MAX_RING_WEIGHT_KG = 300
export const OPENING_OFFER_COUNT = 3
export const MOVE_KINDS = ['quick', 'heavy', 'technical', 'aerial', 'counter', 'signature', 'finisher'] as const
export const MOVE_SLOTS = { quick: 4, heavy: 4, technical: 3, aerial: 2, counter: 3, signature: 2, finisher: 2 } as const

export type Style = typeof STYLES[number]
export type Alignment = typeof ALIGNMENTS[number]
export type Difficulty = typeof DIFFICULTIES[number]
export type Division = typeof DIVISIONS[number]
export type PromotionId = typeof PROMOTIONS[number]
export type CompanyId = typeof COMPANIES[number]
export type MoveKind = typeof MOVE_KINDS[number]
export type Attributes = Record<Attribute, number>
export type TeamFormat = typeof TEAM_FORMATS[number]
export type MatchFormat = typeof MATCH_FORMATS[number]
export type TeamSize = typeof TEAM_SIZE[TeamFormat]
export type WrestlingTeam<T = string> = readonly [T, T] | readonly [T, T, T]

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' }
export const DIVISION_LABEL: Record<Division, string> = { men: 'Masculina', women: 'Feminina' }
export const MOVE_KIND_LABEL: Record<MoveKind, string> = {
  quick: 'Rápidos', heavy: 'Fortes', technical: 'Técnicos', aerial: 'Aéreos',
  counter: 'Reversões', signature: 'Signatures', finisher: 'Finishers',
}

const styleWeights: Record<Style, readonly number[]> = {
  Highflyer: [5, 23, 10, 6, 15, 9, 6, 16, 10],
  Powerhouse: [24, 4, 7, 18, 12, 7, 5, 16, 7],
  Technician: [7, 9, 24, 7, 9, 6, 15, 9, 14],
  Brawler: [20, 6, 7, 18, 12, 10, 9, 10, 8],
  'Submission Specialist': [8, 6, 22, 8, 10, 4, 12, 18, 12],
  'All-Rounder': [12, 11, 12, 11, 11, 10, 11, 12, 10],
}

export function startingAttributes(): Attributes {
  return Object.fromEntries(ATTRIBUTES.map(key => [key, INITIAL_ATTRIBUTE])) as Attributes
}

export function pointsSpent(attributes: Attributes): number {
  return ATTRIBUTES.reduce((total, key) => total + attributes[key] - INITIAL_ATTRIBUTE, 0)
}

export function suggestedAttributes(style: Style): Attributes {
  const weights = styleWeights[style]
  const attributes = startingAttributes()
  let remaining = INITIAL_BUDGET
  ATTRIBUTES.forEach((key, index) => {
    const points = Math.floor(INITIAL_BUDGET * weights[index] / 100)
    attributes[key] += points
    remaining -= points
  })
  const ordered = [...ATTRIBUTES].sort((a, b) => weights[ATTRIBUTES.indexOf(b)] - weights[ATTRIBUTES.indexOf(a)])
  ordered.slice(0, remaining).forEach(key => { attributes[key] += 1 })
  return attributes
}

export function overall(attributes: Attributes, style: Style): number {
  return Math.round(ATTRIBUTES.reduce((sum, key, index) => sum + attributes[key] * styleWeights[style][index], 0) / 100)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function addDays(date: string, days: number): string {
  const utc = new Date(date + 'T00:00:00Z')
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

export function dayDistance(from: string, to: string): number {
  return (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000
}

export const dateSchema = z.iso.date()
export const ringWeightSchema = z.number().int().min(MIN_RING_WEIGHT_KG).max(MAX_RING_WEIGHT_KG)
const safeInt = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
const rngSchema = z.number().int().min(1).max(0xffffffff)
const id = z.string().min(1).max(150)
const promotion = z.enum(PROMOTIONS)
const attrs = z.object(Object.fromEntries(ATTRIBUTES.map(key => [key, z.number().int().min(INITIAL_ATTRIBUTE).max(ATTRIBUTE_CAP)])) as Record<Attribute, z.ZodNumber>)
const shortText = z.string().trim().max(75)
export const profileSchema = z.object({
  name: shortText.min(2),
  nickname: shortText,
  country: shortText.min(2),
  city: shortText,
  age: z.number().int().min(16).max(80),
  ringWeightKg: ringWeightSchema.nullable().default(null),
  division: z.enum(DIVISIONS),
  alignment: z.enum(ALIGNMENTS),
  style: z.enum(STYLES),
  personality: shortText.min(2),
  appearance: shortText,
  gear: shortText,
  entrance: shortText,
  attributes: attrs,
  moves: z.array(id).length(20),
  moveLevels: z.record(id, z.number().int().min(1).max(3)),
})
export type Profile = z.infer<typeof profileSchema>

const terms = {
  promotion,
  weeks: z.number().int().min(8).max(52),
  pay: z.number().int().min(1).max(100_000),
  winBonus: z.number().int().min(1).max(100_000),
}
const offerSchema = z.object({
  id,
  ...terms,
  status: z.enum(['available', 'declined']),
  response: z.enum(['pending', 'accepted', 'rejected']),
})
const contractSchema = z.object({
  ...terms,
  start: dateSchema,
  end: dateSchema,
  status: z.enum(['active', 'expired']),
})
export type Offer = z.infer<typeof offerSchema>
export type Contract = z.infer<typeof contractSchema>

const method = z.enum(['pinfall', 'submission'])
export type Method = z.infer<typeof method>
export const METHOD_LABEL: Record<Method, string> = { pinfall: 'Pinfall', submission: 'Submissão' }

const sideSchema = z.object({
  condition: z.number().min(0).max(100),
  stamina: z.number().min(0).max(100),
  momentum: z.number().min(0).max(100),
  position: z.enum(['standing', 'grounded', 'corner']),
})
const turnLogSchema = z.object({ turn: safeInt, actor: z.enum(['player', 'rival', 'referee']), text: z.string().min(1).max(300) })
const finishSchema = z.object({ winner: z.enum(['player', 'rival']), method })
const partnerSchema = z.object({ id, side: sideSchema })
const tagCornerSchema = z.object({
  partners: z.union([z.tuple([partnerSchema]), z.tuple([partnerSchema, partnerSchema])]),
  legalIndex: z.literal([0, 1, 2]),
  lastTagTurn: safeInt.positive().nullable(),
  saveUsed: z.boolean(),
})
const boutSchema = z.object({
  id, showId: id, rivalId: id, titleId: id.optional(),
  turn: safeInt,
  player: sideSchema,
  rival: sideSchema,
  plan: id,
  log: z.array(turnLogSchema),
  used: z.array(id),
  finish: finishSchema.nullable(),
  xpAwarded: safeInt,
  tag: z.object({ player: tagCornerSchema, rival: tagCornerSchema, mixed: z.literal(true).optional() }).optional(),
})
export type Bout = z.infer<typeof boutSchema>
export type BoutSide = z.infer<typeof sideSchema>
export type TagBout = Bout & { tag: NonNullable<Bout['tag']> }
export type Actor = 'player' | 'rival'
export type TurnLog = z.infer<typeof turnLogSchema>

export const showSchema = z.object({
  id,
  promotion,
  date: dateSchema,
  name: z.string().min(1).max(100),
  origin: z.enum(['announced', 'generated']),
  special: z.boolean(),
  series: z.literal('tamashii').optional(),
  guestPromotions: z.array(promotion).optional(),
})
export type Show = z.infer<typeof showSchema>

const matchSchema = z.object({
  id,
  firstId: id,
  secondId: id,
  winnerId: id,
  method,
  rounds: safeInt,
  player: z.boolean(),
  titleId: id.optional(),
  tag: z.object({
    firstPartners: z.array(id).min(1).max(2),
    secondPartners: z.array(id).min(1).max(2),
    mixed: z.literal(true).optional(),
  }).optional(),
})
export type MatchResult = z.infer<typeof matchSchema>
const reportSchema = showSchema.extend({ matches: z.array(matchSchema) })
export type ShowReport = z.infer<typeof reportSchema>

const historySchema = z.object({
  id, date: dateSchema,
  kind: z.enum(['career', 'contract', 'show', 'match', 'progression', 'title', 'team']),
  title: z.string().min(1).max(240),
  detail: z.string().min(1).max(360),
  promotion: promotion.nullable(),
})
export type HistoryItem = z.infer<typeof historySchema>

const ledgerSchema = z.object({
  id, date: dateSchema, label: z.string().min(1).max(110),
  amount: safeInt,
})
export type LedgerItem = z.infer<typeof ledgerSchema>

export const careerSchema = z.object({
  schemaVersion: z.literal(SAVE_VERSION),
  dataVersion: z.literal(DATA_VERSION),
  id: z.uuid(),
  revision: safeInt,
  createdAt: safeInt,
  mode: z.literal('free'),
  profile: profileSchema,
  difficulty: z.enum(DIFFICULTIES),
  rng: rngSchema,
  date: dateSchema,
  worldThrough: dateSchema,
  offers: z.array(offerSchema).max(OPENING_OFFER_COUNT),
  contract: contractSchema.nullable(),
  xp: safeInt,
  popularity: safeInt.max(100),
  bout: boutSchema.nullable(),
  shows: z.array(reportSchema),
  expandedOn: dateSchema.nullable(),
  vacatedTitles: z.array(z.object({ titleId: id, date: dateSchema })),
  tagPartnerId: id.nullable(),
  trioPartnerIds: z.tuple([id, id]).nullable(),
  mixedPartnerId: id.nullable(),
  preferredFormat: z.enum(MATCH_FORMATS),
  history: z.array(historySchema),
  ledger: z.array(ledgerSchema),
})
export type Career = z.infer<typeof careerSchema>
