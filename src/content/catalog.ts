import {
  ATTRIBUTES, PROMOTIONS, addDays, clamp, dayDistance, suggestedAttributes,
  type Alignment, type Attributes, type Division, type PromotionId, type Show, type Style,
} from '../domain/model'
import { defaultMoves } from './moves'

export const SOURCES = {
  nxtDecember: 'https://www.wwe.com/shows/wwenxt/2025-12-30/results',
  nxtDeadline: 'https://www.wwe.com/shows/nxtple/nxt-deadline-2025/results',
  nxtTitle: 'https://www.wwe.com/titlehistory/nxt-championship',
  nxtWomen: 'https://www.wwe.com/titlehistory/nxt-womens-championship',
  nxtEvil: 'https://www.wwe.com/shows/wwenxt/2026-01-06/results',
  tnaFinal: 'https://tnawrestling.com/news/tna-final-resolution-2025-live-results',
  tnaDecember: 'https://tnawrestling.com/news/tna-impact-results-december-18-2025',
  tnaDallas: 'https://tnawrestling.com/news/tna-wrestling-to-make-history-over-two-special-nights-in-dallas',
  tnaJanuary: 'https://tnawrestling.com/news/tna-impact-preview-january-1-2026',
  tnaTv: 'https://tnawrestling.com/news/tna-thursday-night-impact-on-amc-live-results-august-27-2026',
  rohDecember: 'https://www.ringofhonor.com/post/roh-final-battle-results-dec-5-2025',
  rohWeekly: 'https://www.ringofhonor.com/post/roh-on-honor-club-episode-101-preview',
} as const

type Promotion = {
  id: PromotionId
  name: string
  initials: string
  home: string
  description: string
  accent: string
  firstWeekly: string
  weekly: string
  basePay: number
  source: string
}

export const ORGANIZATIONS: Record<PromotionId, Promotion> = {
  nxt: {
    id: 'nxt', name: 'WWE NXT', initials: 'NXT', home: 'Estados Unidos',
    description: 'Brand de desenvolvimento da WWE com programação semanal e eventos especiais.',
    accent: '#e7d66a', firstWeekly: '2026-01-06', weekly: 'WWE NXT', basePay: 580, source: SOURCES.nxtDecember,
  },
  tna: {
    id: 'tna', name: 'TNA Wrestling', initials: 'TNA', home: 'Estados Unidos',
    description: 'Divisões X-Division e Knockouts, com o iMPACT! como programa semanal.',
    accent: '#f08072', firstWeekly: '2026-01-01', weekly: 'TNA iMPACT!', basePay: 440, source: SOURCES.tnaDallas,
  },
  roh: {
    id: 'roh', name: 'Ring of Honor', initials: 'ROH', home: 'Estados Unidos',
    description: 'Circuito semanal do HonorClub e divisões com tradição em lutas técnicas.',
    accent: '#9bb9fc', firstWeekly: '2026-01-08', weekly: 'ROH on HonorClub', basePay: 370, source: SOURCES.rohWeekly,
  },
}

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

type RosterEntry = Fighter & { promotion: PromotionId; appearance: { date: string; source: string } }

function rosterEntry(
  id: string, name: string, promotion: PromotionId, division: Division,
  style: Style, power: number, alignment: Alignment, date: string, source: string,
): RosterEntry {
  const attributes = suggestedAttributes(style)
  ATTRIBUTES.forEach(attribute => { attributes[attribute] = clamp(attributes[attribute] + power, 40, 94) })
  return { id, name, promotion, division, style, alignment, attributes, moves: defaultMoves(style), moveLevels: {}, appearance: { date, source } }
}

const NXT = '2025-12-30'
const DEADLINE = '2025-12-06'
const TNA = '2025-12-18'
const FINAL_BATTLE = '2025-12-05'

export const ROSTER: readonly RosterEntry[] = [
  rosterEntry('oba-femi', 'Oba Femi', 'nxt', 'men', 'Powerhouse', 13, 'Tweener', DEADLINE, SOURCES.nxtDeadline),
  rosterEntry('ricky-saints', 'Ricky Saints', 'nxt', 'men', 'All-Rounder', 12, 'Face', DEADLINE, SOURCES.nxtDeadline),
  rosterEntry('ethan-page', 'Ethan Page', 'nxt', 'men', 'Brawler', 11, 'Heel', NXT, SOURCES.nxtDecember),
  rosterEntry('tavion-heights', 'Tavion Heights', 'nxt', 'men', 'Technician', -1, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('jasper-troy', 'Jasper Troy', 'nxt', 'men', 'Powerhouse', 0, 'Tweener', NXT, SOURCES.nxtDecember),
  rosterEntry('jevon-evans', 'Je’Von Evans', 'nxt', 'men', 'Highflyer', 6, 'Face', DEADLINE, SOURCES.nxtDeadline),
  rosterEntry('jacy-jayne', 'Jacy Jayne', 'nxt', 'women', 'Brawler', 12, 'Heel', NXT, SOURCES.nxtDecember),
  rosterEntry('wren-sinclair', 'Wren Sinclair', 'nxt', 'women', 'Technician', -2, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('kendal-grey', 'Kendal Grey', 'nxt', 'women', 'Technician', 1, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('tatum-paxley', 'Tatum Paxley', 'nxt', 'women', 'All-Rounder', 7, 'Face', NXT, SOURCES.nxtDecember),
  rosterEntry('izzi-dame', 'Izzi Dame', 'nxt', 'women', 'Powerhouse', 4, 'Heel', NXT, SOURCES.nxtDecember),
  rosterEntry('frankie-kazarian', 'Frankie Kazarian', 'tna', 'men', 'Technician', 12, 'Heel', TNA, SOURCES.tnaDecember),
  rosterEntry('leon-slater', 'Leon Slater', 'tna', 'men', 'Highflyer', 7, 'Face', '2025-12-05', SOURCES.tnaFinal),
  rosterEntry('mike-santana', 'Mike Santana', 'tna', 'men', 'Brawler', 12, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('eddie-edwards', 'Eddie Edwards', 'tna', 'men', 'Brawler', 5, 'Heel', '2025-12-05', SOURCES.tnaFinal),
  rosterEntry('bear-bronson', 'Bear Bronson', 'tna', 'men', 'Powerhouse', -2, 'Tweener', TNA, SOURCES.tnaDecember),
  rosterEntry('cedric-alexander', 'Cedric Alexander', 'tna', 'men', 'Highflyer', 3, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('lei-ying-lee', 'Léi Yǐng Lee', 'tna', 'women', 'Brawler', 10, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('xia-brookside', 'Xia Brookside', 'tna', 'women', 'Technician', 0, 'Face', TNA, SOURCES.tnaDecember),
  rosterEntry('tessa-blanchard', 'Tessa Blanchard', 'tna', 'women', 'All-Rounder', 8, 'Heel', TNA, SOURCES.tnaDecember),
  rosterEntry('mila-moore', 'Mila Moore', 'tna', 'women', 'Brawler', -4, 'Heel', TNA, SOURCES.tnaDecember),
  rosterEntry('dani-luna', 'Dani Luna', 'tna', 'women', 'Powerhouse', 3, 'Tweener', TNA, SOURCES.tnaDecember),
  rosterEntry('bandido', 'Bandido', 'roh', 'men', 'Highflyer', 14, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('blake-christian', 'Blake Christian', 'roh', 'men', 'Highflyer', 1, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('lee-moriarty', 'Lee Moriarty', 'roh', 'men', 'Submission Specialist', 6, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('komander', 'Komander', 'roh', 'men', 'Highflyer', 2, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('sammy-guevara', 'Sammy Guevara', 'roh', 'men', 'Highflyer', 9, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('beast-mortos', 'The Beast Mortos', 'roh', 'men', 'Powerhouse', 7, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('athena', 'Athena', 'roh', 'women', 'All-Rounder', 15, 'Heel', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('deonna-purrazzo', 'Deonna Purrazzo', 'roh', 'women', 'Submission Specialist', 10, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('billie-starkz', 'Billie Starkz', 'roh', 'women', 'Highflyer', 3, 'Tweener', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('red-velvet', 'Red Velvet', 'roh', 'women', 'Brawler', 7, 'Face', FINAL_BATTLE, SOURCES.rohDecember),
  rosterEntry('trish-adora', 'Trish Adora', 'roh', 'women', 'Technician', 0, 'Tweener', FINAL_BATTLE, SOURCES.rohDecember),
]

export const ROSTER_BY_ID = new Map(ROSTER.map(fighter => [fighter.id, fighter]))
export const rosterFor = (promotion: PromotionId) => ROSTER.filter(fighter => fighter.promotion === promotion)

type TitleRecord = {
  id: string
  name: string
  promotion: PromotionId
  holder: string | null
  status: 'active' | 'later'
  source: string
}

export const OPENING_TITLES: readonly TitleRecord[] = [
  { id: 'nxt-men', name: 'NXT Championship', promotion: 'nxt', holder: 'Oba Femi', status: 'active', source: SOURCES.nxtTitle },
  { id: 'nxt-women', name: 'NXT Women’s Championship', promotion: 'nxt', holder: 'Jacy Jayne', status: 'active', source: SOURCES.nxtWomen },
  { id: 'nxt-na', name: 'NXT North American Championship', promotion: 'nxt', holder: 'Ethan Page', status: 'active', source: SOURCES.nxtDecember },
  { id: 'tna-world', name: 'TNA World Championship', promotion: 'tna', holder: 'Frankie Kazarian', status: 'active', source: SOURCES.tnaDallas },
  { id: 'tna-knockouts', name: 'TNA Knockouts World Championship', promotion: 'tna', holder: 'Léi Yǐng Lee', status: 'active', source: SOURCES.tnaDallas },
  { id: 'tna-x', name: 'TNA X Division Championship', promotion: 'tna', holder: 'Leon Slater', status: 'active', source: SOURCES.tnaDallas },
  { id: 'tna-knockouts-tv', name: 'TNA Knockouts Television Championship', promotion: 'tna', holder: null, status: 'later', source: SOURCES.tnaTv },
  { id: 'roh-world', name: 'ROH World Championship', promotion: 'roh', holder: 'Bandido', status: 'active', source: SOURCES.rohDecember },
  { id: 'roh-pure', name: 'ROH Pure Championship', promotion: 'roh', holder: 'Lee Moriarty', status: 'active', source: SOURCES.rohDecember },
  { id: 'roh-women', name: 'ROH Women’s World Championship', promotion: 'roh', holder: 'Athena', status: 'active', source: SOURCES.rohDecember },
  { id: 'roh-women-tv', name: 'ROH Women’s World Television Championship', promotion: 'roh', holder: 'Red Velvet', status: 'active', source: SOURCES.rohDecember },
  { id: 'roh-women-pure', name: 'ROH Women’s Pure Championship', promotion: 'roh', holder: 'Deonna Purrazzo', status: 'active', source: SOURCES.rohDecember },
]

function createShow(promotion: PromotionId, date: string, name: string, origin: Show['origin'], special = false): Show {
  return { id: promotion + '@' + date, promotion, date, name, origin, special }
}

export const ANNOUNCED_SHOWS = [
  { ...createShow('tna', '2026-01-01', 'TNA iMPACT!', 'announced'), source: SOURCES.tnaJanuary },
  { ...createShow('nxt', '2026-01-06', 'NXT New Year’s Evil', 'announced', true), source: SOURCES.nxtDecember },
  { ...createShow('tna', '2026-01-15', 'TNA iMPACT! — estreia no AMC', 'announced', true), source: SOURCES.tnaDallas },
  { ...createShow('tna', '2026-01-17', 'TNA Genesis', 'announced', true), source: SOURCES.tnaDallas },
]

export function nextShows(promotion: PromotionId, after: string, count: number): Show[] {
  const organization = ORGANIZATIONS[promotion]
  const offset = Math.max(0, Math.floor(dayDistance(organization.firstWeekly, after) / 7) + 1)
  const events = new Map<string, Show>()
  for (let index = 0; index < count; index++) {
    const date = addDays(organization.firstWeekly, (offset + index) * 7)
    events.set(date, createShow(promotion, date, organization.weekly, 'generated'))
  }
  for (const { source: _source, ...event } of ANNOUNCED_SHOWS) {
    if (event.promotion === promotion && event.date > after) events.set(event.date, event)
  }
  return [...events.values()].sort(compareShows).slice(0, count)
}

export function compareShows(a: Show, b: Show): number {
  return a.date.localeCompare(b.date) || a.promotion.localeCompare(b.promotion)
}

export function upcomingShows(after: string, count = 3): Show[] {
  return PROMOTIONS.flatMap(promotion => nextShows(promotion, after, count)).sort(compareShows)
}
