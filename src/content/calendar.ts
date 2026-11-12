import { PROMOTIONS, addDays, dayDistance, type PromotionId, type Show } from '../domain/model'
import { SOURCES } from './sources'

type Cadence = { start: string; days: number; name: string }
const SCHEDULE: Record<PromotionId, readonly Cadence[]> = {
  raw: [{ start: '2026-01-05', days: 7, name: 'WWE Raw' }],
  smackdown: [{ start: '2026-01-02', days: 7, name: 'WWE SmackDown' }],
  nxt: [{ start: '2026-01-06', days: 7, name: 'WWE NXT' }],
  aew: [{ start: '2026-01-07', days: 7, name: 'AEW Dynamite' }, { start: '2026-01-03', days: 7, name: 'AEW Collision' }],
  njpw: [{ start: '2026-01-10', days: 7, name: 'NJPW Road To' }],
  tna: [{ start: '2026-01-01', days: 7, name: 'TNA iMPACT!' }],
  aaa: [{ start: '2026-01-17', days: 7, name: 'Lucha Libre AAA' }],
  roh: [{ start: '2026-01-08', days: 7, name: 'ROH on HonorClub' }],
  bwf: [{ start: '2026-01-24', days: 28, name: 'BWF Telecatch' }],
}

function createShow(promotion: PromotionId, date: string, name: string, origin: Show['origin'], special = false,
  guestPromotions?: PromotionId[]): Show {
  const show: Show = { id: promotion + '@' + date, promotion, date, name, origin, special }
  return guestPromotions?.length ? { ...show, guestPromotions } : show
}

function announced(promotion: PromotionId, date: string, name: string, source: string, special = true, shared = false) {
  return { ...createShow(promotion, date, name, 'announced', special, shared ? ['smackdown'] : undefined), source }
}

export const ANNOUNCED_SHOWS = [
  announced('tna', '2026-01-01', 'TNA iMPACT!', SOURCES.tnaJanuary, false),
  announced('njpw', '2026-01-04', 'Wrestle Kingdom 20', SOURCES.njpwSoldOut),
  announced('njpw', '2026-01-05', 'NJPW New Year Dash', SOURCES.njpwDecCard),
  announced('nxt', '2026-01-06', 'NXT New Year’s Evil', SOURCES.nxtDecember),
  announced('smackdown', '2026-01-09', 'SmackDown · Three Stages of Hell', SOURCES.sd26),
  announced('aew', '2026-01-14', 'AEW Dynamite · Maximum Carnage', SOURCES.aewHoliday),
  announced('tna', '2026-01-15', 'TNA iMPACT! — estreia no AMC', SOURCES.tnaDallas),
  announced('tna', '2026-01-17', 'TNA Genesis', SOURCES.tnaDallas),
  announced('raw', '2026-01-31', 'WWE Royal Rumble', SOURCES.royalRumble, true, true),
  announced('raw', '2026-02-28', 'WWE Elimination Chamber', SOURCES.eliminationChamber, true, true),
  announced('raw', '2026-04-18', 'WrestleMania 42 · Noite 1', SOURCES.wrestleMania, true, true),
  announced('raw', '2026-04-19', 'WrestleMania 42 · Noite 2', SOURCES.wrestleMania, true, true),
  announced('raw', '2026-08-01', 'WWE SummerSlam · Noite 1', SOURCES.summerSlam, true, true),
  announced('raw', '2026-08-02', 'WWE SummerSlam · Noite 2', SOURCES.summerSlam, true, true),
]

type SeasonEvent = readonly [promotion: PromotionId, date: string, name: string, shared?: boolean, from?: number]
const ANNUAL_EVENTS: readonly SeasonEvent[] = [
  ['raw', '01-30', 'WWE Royal Rumble', true, 2027],
  ['raw', '02-27', 'WWE Elimination Chamber', true, 2027],
  ['raw', '04-17', 'WWE WrestleMania', true, 2027],
  ['raw', '07-04', 'WWE Money in the Bank', true],
  ['raw', '08-07', 'WWE SummerSlam', true, 2027],
  ['raw', '11-28', 'WWE Survivor Series', true],
  ['nxt', '02-15', 'NXT Vengeance Day'], ['nxt', '04-17', 'NXT Stand & Deliver'], ['nxt', '12-05', 'NXT Deadline'],
  ['aew', '03-14', 'AEW Revolution'], ['aew', '04-11', 'AEW Dynasty'], ['aew', '05-24', 'AEW Double or Nothing'],
  ['aew', '06-28', 'AEW Forbidden Door'], ['aew', '08-30', 'AEW All In'], ['aew', '09-26', 'AEW All Out'],
  ['aew', '10-17', 'AEW WrestleDream'], ['aew', '11-14', 'AEW Full Gear'], ['aew', '12-27', 'AEW Worlds End'],
  ['njpw', '01-04', 'NJPW Wrestle Kingdom', false, 2027], ['njpw', '01-05', 'NJPW New Year Dash', false, 2027],
  ['njpw', '02-11', 'NJPW The New Beginning'], ['njpw', '03-21', 'NJPW New Japan Cup · especial'],
  ['njpw', '06-14', 'NJPW Dominion'], ['njpw', '08-16', 'NJPW G1 Climax · especial'],
  ['njpw', '10-12', 'NJPW King of Pro-Wrestling'], ['njpw', '11-03', 'NJPW Power Struggle'],
  ['tna', '01-17', 'TNA Genesis', false, 2027], ['tna', '04-18', 'TNA Rebellion'], ['tna', '06-28', 'TNA Slammiversary'],
  ['tna', '10-11', 'TNA Bound for Glory'], ['tna', '12-05', 'TNA Final Resolution'],
  ['aaa', '03-14', 'AAA Rey de Reyes'], ['aaa', '06-13', 'AAA Verano de Escándalo'], ['aaa', '08-22', 'AAA Triplemanía'],
  ['aaa', '10-24', 'AAA Héroes Inmortales'], ['aaa', '12-19', 'AAA Guerra de Titanes'],
  ['roh', '05-16', 'ROH Supercard of Honor'], ['roh', '07-25', 'ROH Death Before Dishonor'], ['roh', '12-05', 'ROH Final Battle'],
  ['bwf', '03-21', 'BWF Noite dos Campeões'], ['bwf', '07-11', 'BWF Maremoto · especial'], ['bwf', '12-12', 'BWF In House · fim de temporada'],
]

type ArchiveEvent = { promotion: PromotionId; date: string; name: string; source: string }
export const ARCHIVE_2026: readonly ArchiveEvent[] = [
  { promotion: 'raw', date: '2026-01-05', name: 'Raw · Stranger Things', source: 'https://www.wwe.com/shows/raw/2026-01-05' },
  { promotion: 'smackdown', date: '2026-01-02', name: 'WWE SmackDown', source: 'https://www.wwe.com/shows/smackdown/2026-01-02' },
  { promotion: 'smackdown', date: '2026-01-09', name: 'SmackDown · Three Stages of Hell', source: 'https://www.wwe.com/shows/smackdown/archive' },
  { promotion: 'nxt', date: '2026-01-06', name: 'NXT New Year’s Evil', source: SOURCES.nxtEvil },
  { promotion: 'aew', date: '2026-01-14', name: 'AEW Dynamite · Maximum Carnage', source: 'https://www.allelitewrestling.com/post/aew-dynamite-results-january-14-2026' },
  { promotion: 'aew', date: '2026-01-17', name: 'AEW Collision · Maximum Carnage', source: SOURCES.aewOpps },
  { promotion: 'aew', date: '2026-03-15', name: 'AEW Revolution', source: 'https://www.allelitewrestling.com/post/aew-revolution-2026-preview' },
  { promotion: 'aew', date: '2026-04-12', name: 'AEW Dynasty', source: 'https://www.allelitewrestling.com/post/aew-dynasty-2026-results' },
  { promotion: 'aew', date: '2026-08-30', name: 'AEW All In: London', source: SOURCES.aewAllIn },
  { promotion: 'aew', date: '2026-09-26', name: 'AEW All Out', source: 'https://www.allelitewrestling.com/post/aew-all-out-results-september-26-2026' },
  { promotion: 'aew', date: '2026-10-17', name: 'AEW WrestleDream', source: SOURCES.aewWrestleDream },
  { promotion: 'njpw', date: '2026-01-04', name: 'Wrestle Kingdom 20', source: SOURCES.njpwWk20 },
  { promotion: 'njpw', date: '2026-01-05', name: 'NJPW New Year Dash', source: SOURCES.njpwDash },
  { promotion: 'njpw', date: '2026-11-03', name: 'NJPW Power Struggle', source: 'https://www.njpw1972.com/tornament/result/662785' },
  { promotion: 'tna', date: '2026-01-17', name: 'TNA Genesis', source: 'https://tnawrestling.com/news/tna-genesis-2026-on-payperview-live-results' },
  { promotion: 'tna', date: '2026-08-27', name: 'TNA iMPACT! · final do Knockouts TV', source: SOURCES.tnaTv },
  { promotion: 'tna', date: '2026-11-05', name: 'TNA Thursday Night iMPACT!', source: SOURCES.tnaNov },
  { promotion: 'aaa', date: '2026-01-17', name: 'Lucha Libre AAA · estreia na FOX', source: 'https://www.wwe.com/shows/aaa/full-lucha-libre-aaa-results-jan-17-2026' },
  { promotion: 'aaa', date: '2026-01-24', name: 'Lucha Libre AAA', source: 'https://www.wwe.com/shows/aaa/lucha-libre-aaa-jan-24-2026/results' },
  { promotion: 'aaa', date: '2026-09-11', name: 'AAA Triplemanía · Las Vegas', source: 'https://www.wwe.com/article/first-ever-triplemania-event-in-las-vegas-moves-to-iconic-mgm-grand-garden-arena' },
  { promotion: 'roh', date: '2026-05-15', name: 'ROH Supercard of Honor', source: 'https://www.cagematch.net/?id=1&nr=449627&page=9' },
  { promotion: 'roh', date: '2026-11-05', name: 'ROH on HonorClub', source: 'https://prowrestling.net/site/2026/11/06/roh-on-honorclub-results-11-5-eddie-kingston-and-ortiz-vs-trent-beretta-and-rocky-romero-roh-pure-champion-lee-moriarty-vs-ar-fox-in-a-proving-ground-match/' },
  { promotion: 'bwf', date: '2026-02-28', name: 'BWF In House 31', source: SOURCES.bwfFeb },
  { promotion: 'bwf', date: '2026-04-26', name: 'BWF Arnold Sports Festival South America', source: SOURCES.bwfArchive },
  { promotion: 'bwf', date: '2026-10-31', name: 'BWF Dia de Los Muertos · Dia 1', source: SOURCES.bwfArchive },
]

const announcedById = new Map(ANNOUNCED_SHOWS.map(show => [show.id, show]))
export function showEvidence(id: string) { return announcedById.get(id)?.source }

export function compareShows(a: Show, b: Show): number {
  return a.date.localeCompare(b.date) || a.promotion.localeCompare(b.promotion)
}

export function showPromotions(show: Show): PromotionId[] {
  return [show.promotion, ...(show.guestPromotions ?? [])]
}

export function nextShows(promotion: PromotionId, after: string, count: number): Show[] {
  if (count <= 0) return []
  const events = new Map<string, Show>()
  for (const cadence of SCHEDULE[promotion]) {
    const offset = Math.max(0, Math.floor(dayDistance(cadence.start, after) / cadence.days) + 1)
    for (let index = 0; index < count; index++) {
      const date = addDays(cadence.start, (offset + index) * cadence.days)
      events.set(date, createShow(promotion, date, cadence.name, 'generated'))
    }
  }
  const cutoff = [...events.keys()].sort().at(-1)!
  const startYear = Number(after.slice(0, 4))
  const endYear = Number(cutoff.slice(0, 4))
  for (let year = startYear; year <= endYear; year++) {
    for (const [circuit, day, name, shared, from = 2026] of ANNUAL_EVENTS) {
      const date = year + '-' + day
      if (circuit === promotion && year >= from && date > after && date <= cutoff) {
        events.set(date, createShow(promotion, date, name, 'generated', true, shared ? ['smackdown'] : undefined))
      }
    }
  }
  for (const { source: _source, ...event } of ANNOUNCED_SHOWS) {
    if (event.promotion === promotion && event.date > after && event.date <= cutoff) events.set(event.date, event)
  }
  return [...events.values()].sort(compareShows).slice(0, count)
}

export function upcomingShows(after: string, count = 3): Show[] {
  return PROMOTIONS.flatMap(promotion => nextShows(promotion, after, count)).sort(compareShows)
}

export function nextShowForCareer(promotion: PromotionId, after: string): Show | undefined {
  const own = nextShows(promotion, after, 1)[0]
  if (promotion !== 'smackdown') return own
  return [own, ...nextShows('raw', after, 4).filter(show => show.guestPromotions?.includes(promotion))]
    .sort(compareShows)[0]
}

export function validLegacyShow(show: Show): boolean {
  if (!(['nxt', 'tna', 'roh'] as readonly PromotionId[]).includes(show.promotion) || show.guestPromotions?.length) return false
  const exact = announcedById.get(show.id)
  if (show.origin === 'announced') return exact?.name === show.name && exact.special === show.special
  const recurring = SCHEDULE[show.promotion][0]
  const days = dayDistance(recurring.start, show.date)
  return days >= 0 && days % recurring.days === 0 && show.name === recurring.name && !show.special
}
