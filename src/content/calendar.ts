import { PROMOTIONS, addDays, dayDistance, type CalendarVersion, type PromotionId, type Show } from '../domain/model'
import { CALENDAR_REFERENCES_2026, REPLACED_RECURRING_DATES, type CalendarReference } from './calendar-2026'
import { SOURCES } from './sources'

type Cadence = { start: string; days: number; name: string; series?: Show['series'] }
const SCHEDULE: Record<PromotionId, readonly Cadence[]> = {
  raw: [{ start: '2026-01-05', days: 7, name: 'WWE Raw' }],
  smackdown: [{ start: '2026-01-02', days: 7, name: 'WWE SmackDown' }],
  nxt: [{ start: '2026-01-06', days: 7, name: 'WWE NXT' }],
  aew: [{ start: '2026-01-07', days: 7, name: 'AEW Dynamite' }, { start: '2026-01-03', days: 7, name: 'AEW Collision' }],
  njpw: [
    { start: '2026-01-25', days: 28, name: 'NJPW TAMASHII', series: 'tamashii' },
    { start: '2026-01-10', days: 7, name: 'NJPW Road To' },
  ],
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

const announcedById = new Map(ANNOUNCED_SHOWS.map(show => [show.id, show]))

function referenceId(entry: CalendarReference) {
  return entry.promotion + '@' + entry.date + (entry.series ? '/' + entry.series : '')
}

export const ARCHIVE_2026 = [...CALENDAR_REFERENCES_2026].sort((a, b) =>
  a.date.localeCompare(b.date) || a.promotion.localeCompare(b.promotion))

const referencesById = new Map(ARCHIVE_2026.map(entry => [referenceId(entry), entry]))
const referencesByPromotion = new Map(PROMOTIONS.map(promotion => [
  promotion, ARCHIVE_2026.filter(entry => entry.promotion === promotion),
]))

export function showReference(show: Pick<Show, 'id' | 'name' | 'origin'>) {
  const entry = referencesById.get(show.id)
  return show.origin !== 'generated' && entry?.name === show.name ? entry : undefined
}

export function showEvidence(id: string) {
  return referencesById.get(id)?.source ?? announcedById.get(id)?.source
}

export function compareShows(a: Show, b: Show): number {
  return a.date.localeCompare(b.date) || a.promotion.localeCompare(b.promotion) || a.id.localeCompare(b.id)
}

export function showPromotions(show: Pick<Show, 'promotion' | 'guestPromotions'>): PromotionId[] {
  return [show.promotion, ...(show.guestPromotions ?? [])]
}

const replacedSpecials: Partial<Record<PromotionId, readonly string[]>> = {
  raw: ['07-04', '11-28'],
  nxt: ['02-15', '04-17'],
  aew: ['03-14', '04-11', '05-24', '06-28', '08-30', '09-26', '10-17', '11-14', '12-27'],
  njpw: ['02-11', '03-21', '06-14', '08-16', '10-12', '11-03'],
  tna: ['04-18', '06-28', '10-11'],
  aaa: ['03-14', '06-13', '08-22', '10-24', '12-19'],
  roh: ['05-16', '07-25', '12-05'],
}

function promotionShows(promotion: PromotionId, after: string, through: string, calendar: CalendarVersion): Show[] {
  const events = new Map<string, Show>()
  const inRange = (date: string) => date > after && date <= through
  const revised = (date: string) => calendar === 'verified' && date.startsWith('2026-')
  const add = (show: Show) => events.set(show.id, show)
  for (const cadence of SCHEDULE[promotion]) {
    const offset = Math.max(0, Math.floor(dayDistance(cadence.start, after) / cadence.days) + 1)
    for (let date = addDays(cadence.start, offset * cadence.days); date <= through; date = addDays(date, cadence.days)) {
      if (revised(date) && REPLACED_RECURRING_DATES[promotion]?.includes(date)) continue
      const show = createShow(promotion, date, cadence.name, 'generated', Boolean(cadence.series))
      add(cadence.series ? { ...show, series: cadence.series } : show)
    }
  }
  const startYear = Number(after.slice(0, 4))
  const endYear = Number(through.slice(0, 4))
  for (let year = startYear; year <= endYear; year++) {
    for (const [circuit, day, name, shared, from = 2026] of ANNUAL_EVENTS) {
      const date = year + '-' + day
      if (circuit !== promotion || year < from || !inRange(date) || (revised(date) && replacedSpecials[promotion]?.includes(day))) continue
      add(createShow(promotion, date, name, 'generated', true, shared ? ['smackdown'] : undefined))
    }
  }
  for (const { source: _source, ...show } of ANNOUNCED_SHOWS) {
    if (show.promotion === promotion && inRange(show.date)) add(show)
  }
  if (calendar === 'verified' && after < '2026-12-31' && through >= '2026-01-01') {
    for (const entry of referencesByPromotion.get(promotion) ?? []) {
      if (!inRange(entry.date)) continue
      const id = referenceId(entry)
      if (entry.series && events.get(promotion + '@' + entry.date)?.series === entry.series) events.delete(promotion + '@' + entry.date)
      const origin = announcedById.has(id) ? 'announced' : 'verified'
      const show = createShow(promotion, entry.date, entry.name, origin, entry.special, entry.guestPromotions)
      add({ ...show, id, ...(entry.series ? { series: entry.series } : {}) })
    }
  }
  return [...events.values()].sort(compareShows)
}

export function showsThrough(after: string, through: string, calendar: CalendarVersion = 'verified'): Show[] {
  return PROMOTIONS.flatMap(promotion => promotionShows(promotion, after, through, calendar)).sort(compareShows)
}

export function scheduledShow(show: Pick<Show, 'id' | 'promotion' | 'date'>, calendar: CalendarVersion) {
  return promotionShows(show.promotion, addDays(show.date, -1), show.date, calendar).find(entry => entry.id === show.id)
}

export function nextShows(promotion: PromotionId, after: string, count: number, calendar: CalendarVersion = 'verified'): Show[] {
  if (count <= 0) return []
  let span = count * (promotion === 'bwf' ? 28 : 7)
  while (true) {
    const events = promotionShows(promotion, after, addDays(after, span), calendar)
    if (events.length >= count) return events.slice(0, count)
    span *= 2
  }
}

export function upcomingShows(after: string, count = 3, calendar: CalendarVersion = 'verified'): Show[] {
  return PROMOTIONS.flatMap(promotion => nextShows(promotion, after, count, calendar)).sort(compareShows)
}

export function nextShowForCareer(promotion: PromotionId, after: string, calendar: CalendarVersion = 'verified',
  eligible: (show: Show) => boolean = () => true): Show | undefined {
  const own = nextShows(promotion, after, 2, calendar).find(eligible)
  if (!own) return undefined
  const circuits = calendar === 'verified' && after < '2026-12-31' ? PROMOTIONS : promotion === 'smackdown' ? ['raw'] as const : []
  const guest = circuits.filter(id => id !== promotion).flatMap(id => promotionShows(id, after, own.date, calendar))
    .filter(show => show.guestPromotions?.includes(promotion) && eligible(show))
  return [...guest, own].sort(compareShows)[0]
}

export function validLegacyShow(show: Show): boolean {
  if (!(['nxt', 'tna', 'roh'] as readonly PromotionId[]).includes(show.promotion) || show.guestPromotions?.length) return false
  const exact = announcedById.get(show.id)
  if (show.origin === 'announced') return exact?.name === show.name && exact.special === show.special
  const recurring = SCHEDULE[show.promotion][0]
  const days = dayDistance(recurring.start, show.date)
  return days >= 0 && days % recurring.days === 0 && show.name === recurring.name && !show.special
}
