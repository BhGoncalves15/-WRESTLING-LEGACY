import { ATTRIBUTES, clamp, suggestedAttributes, type Alignment, type Attributes, type Division, type PromotionId, type Style } from '../domain/model'
import { defaultMoves } from './moves'

export type Fighter = {
  id: string
  name: string
  division: Division
  style: Style
  alignment: Alignment
  attributes: Attributes
  moves: string[]
  moveLevels: Record<string, number>
}

export type Appearance = { promotion: PromotionId; date: string; source: string }
export type RosterEntry = Fighter & {
  promotion: PromotionId
  appearance: Appearance
  guests: readonly Appearance[]
  aliases?: readonly string[]
}

export function rosterEntry(
  id: string, name: string, promotion: PromotionId, division: Division,
  style: Style, power: number, alignment: Alignment, date: string, source: string,
  guests: readonly Appearance[] = [], aliases?: readonly string[],
): RosterEntry {
  const attributes = suggestedAttributes(style)
  ATTRIBUTES.forEach(attribute => { attributes[attribute] = clamp(attributes[attribute] + power, 40, 94) })
  return { id, name, promotion, division, style, alignment, attributes, moves: defaultMoves(style), moveLevels: {}, appearance: { promotion, date, source }, guests, aliases }
}


type RosterRow = readonly [id: string, name: string, style: Style, ratingAdjustment: number, alignment: Alignment]

export function rosterGroup(promotion: PromotionId, date: string, source: string, division: Division,
  rows: readonly RosterRow[]): RosterEntry[] {
  return rows.map(([id, name, style, rating, alignment]) => rosterEntry(id, name, promotion, division, style, rating, alignment, date, source))
}
