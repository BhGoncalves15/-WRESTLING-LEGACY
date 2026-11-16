import type { PromotionId, Show } from '../domain/model'
import { AEW_ROSTER } from './roster-aew'
import { type Appearance, type RosterEntry } from './roster-model'
import { NJPW_ROSTER, TAMASHII_IDS, TAMASHII_REGIONAL_IDS } from './roster-njpw'
import { PILOT_ROSTER } from './roster-pilot'
import { REGIONAL_ROSTER } from './roster-regional'
import { WWE_ROSTER } from './roster-wwe'
import { SOURCES } from './sources'

const GUESTS: Readonly<Record<string, readonly Appearance[]>> = {
  'dominik-mysterio': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'dragon-lee': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'rey-mysterio': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'ethan-page': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'jevon-evans': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'chelsea-green': [{ promotion: 'aaa', date: '2025-11-02', source: SOURCES.aaaSnapshot }],
  'lola-vice': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  natalya: [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'dexter-lumis': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'joe-gacy': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'rey-fenix': [{ promotion: 'aaa', date: '2025-12-20', source: SOURCES.aaaCard }],
  'konosuke-takeshita': [{ promotion: 'njpw', date: '2025-12-27', source: SOURCES.aewWorldsEnd }],
  'gabe-kidd': [{ promotion: 'aew', date: '2025-12-27', source: SOURCES.aewWorldsEnd }],
  bandido: [{ promotion: 'aew', date: '2025-12-31', source: SOURCES.aewYearEnd }],
  athena: [{ promotion: 'aew', date: '2025-12-27', source: SOURCES.aewWorldsEnd }],
  'beast-mortos': [{ promotion: 'aew', date: '2025-12-31', source: SOURCES.aewYearEnd }],
  'mercedes-mone': [{ promotion: 'roh', date: '2025-12-05', source: SOURCES.rohDecember }],
  ricochet: [{ promotion: 'roh', date: '2025-12-05', source: SOURCES.rohDecember }],
  stacks: [{ promotion: 'tna', date: '2025-12-05', source: SOURCES.tnaFinal }],
  'leon-slater': [{ promotion: 'nxt', date: '2025-12-16', source: SOURCES.nxtDec16 }],
  moose: [{ promotion: 'nxt', date: '2025-12-30', source: SOURCES.nxtDecember }],
  'tyson-dupont': [{ promotion: 'tna', date: '2025-12-05', source: SOURCES.tnaFinal }],
  'tyriek-igwe': [{ promotion: 'tna', date: '2025-12-05', source: SOURCES.tnaFinal }],
  'joe-hendry': [{ promotion: 'smackdown', date: '2025-12-26', source: SOURCES.sd26 }],
  asuka: [{ promotion: 'smackdown', date: '2025-12-19', source: SOURCES.sd19 }],
  'kairi-sane': [{ promotion: 'smackdown', date: '2025-12-19', source: SOURCES.sd19 }],
}

export const ROSTER: readonly RosterEntry[] = [...PILOT_ROSTER, ...WWE_ROSTER, ...AEW_ROSTER, ...NJPW_ROSTER, ...REGIONAL_ROSTER]
  .map(fighter => ({ ...fighter, guests: GUESTS[fighter.id] ?? fighter.guests }))

export const ROSTER_BY_ID = new Map(ROSTER.map(fighter => [fighter.id, fighter]))

export function evidenceFor(fighter: RosterEntry, promotion: PromotionId) {
  return fighter.promotion === promotion ? fighter.appearance : fighter.guests.find(entry => entry.promotion === promotion)
}

export function wrestlerAppearsIn(fighter: RosterEntry, promotion: PromotionId) {
  return Boolean(evidenceFor(fighter, promotion))
}

export function rosterFor(promotion: PromotionId, includeGuests = true) {
  return ROSTER.filter(fighter => fighter.promotion === promotion || (includeGuests && wrestlerAppearsIn(fighter, promotion)))
}

export function fitsEventRoster(show: Show, fighterId: string) {
  return show.series === 'tamashii' ? TAMASHII_IDS.has(fighterId) : !TAMASHII_REGIONAL_IDS.has(fighterId)
}
