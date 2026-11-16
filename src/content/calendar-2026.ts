import type { PromotionId, Show } from '../domain/model'
import { SOURCES } from './sources'

export type CalendarReference = {
  promotion: PromotionId
  date: string
  name: string
  source: string
  sourceKind: 'official' | 'documented'
  city?: string
  venue?: string
  special: boolean
  guestPromotions?: PromotionId[]
  series?: Show['series']
  broadcast?: boolean
}

type EventOptions = Pick<CalendarReference, 'city' | 'venue' | 'guestPromotions' | 'series' | 'broadcast'> & {
  regular?: boolean
  documented?: boolean
}

function event(promotion: PromotionId, day: string, name: string, source: string, options: EventOptions = {}): CalendarReference {
  const { regular, documented, ...details } = options
  return { promotion, date: '2026-' + day, name, source, special: !regular, sourceKind: documented ? 'documented' : 'official', ...details }
}

const wwe = 'https://www.wwe.com'
const corporate = 'https://corporate.wwe.com/about/news/'
const aew = 'https://www.allelitewrestling.com'
const tna = 'https://tnawrestling.com'
const njpw = 'https://www.njpw1972.com'
const roh = 'https://www.ringofhonor.com'
const wweUpcoming = wwe + '/article/wwe-upcoming-events'
const aewDates = aew + '/aew-events'
const tnaSchedule = tna + '/news/tna-wrestling-releases-its-full-2026-live-events-schedule'

type TvDate = readonly [day: string, brand: 'R' | 'S' | 'RS', city: string, venue: string]

function wweTelevision(source: string, dates: readonly TvDate[]) {
  return dates.map(([day, brand, city, venue]) => {
    const promotion = brand === 'S' ? 'smackdown' : 'raw'
    const name = brand === 'R' ? 'WWE Raw' : brand === 'S' ? 'WWE SmackDown' : 'WWE Raw e SmackDown · gravação conjunta'
    return event(promotion, day, name, source, { city, venue, regular: true, guestPromotions: brand === 'RS' ? ['smackdown'] : undefined })
  })
}

const wweTour = [
  ...wweTelevision(corporate + '2025/11-07-2025', [
    ['02-02', 'R', 'Filadélfia, PA', 'Xfinity Mobile Arena'], ['02-06', 'S', 'Charlotte, NC', 'Spectrum Center'],
    ['02-09', 'R', 'Cleveland, OH', 'Rocket Arena'], ['02-13', 'S', 'Dallas, TX', 'American Airlines Center'],
    ['02-16', 'R', 'Memphis, TN', 'FedExForum'], ['02-20', 'S', 'Sunrise, FL', 'Amerant Bank Arena'],
    ['02-23', 'R', 'Atlanta, GA', 'State Farm Arena'], ['02-27', 'S', 'Louisville, KY', 'KFC Yum! Center'],
    ['03-02', 'R', 'Indianápolis, IN', 'Gainbridge Fieldhouse'], ['03-20', 'S', 'Raleigh, NC', 'Lenovo Center'],
    ['04-03', 'S', 'St. Louis, MO', 'Enterprise Center'],
  ]),
  ...wweTelevision(corporate + '2026/01-08-2026', [
    ['03-06', 'S', 'Portland, OR', 'Moda Center'], ['03-09', 'R', 'Seattle, WA', 'Climate Pledge Arena'],
    ['03-13', 'S', 'Phoenix, AZ', 'PHX Arena'], ['03-16', 'R', 'San Antonio, TX', 'Frost Bank Center'],
    ['03-27', 'S', 'Pittsburgh, PA', 'PPG Paints Arena'], ['03-30', 'R', 'Nova York, NY', 'Madison Square Garden'],
    ['04-06', 'R', 'Houston, TX', 'Toyota Center'], ['04-10', 'S', 'San José, CA', 'SAP Center'],
    ['04-13', 'R', 'Sacramento, CA', 'Golden 1 Center'],
  ]),
  ...wweTelevision(corporate + '2026/02-26-2026', [
    ['04-24', 'S', 'Fort Worth, TX', 'Dickies Arena'], ['04-27', 'R', 'Laredo, TX', 'Sames Auto Arena'],
    ['05-01', 'S', 'Tulsa, OK', 'BOK Center'], ['05-04', 'R', 'Omaha, NE', 'CHI Health Center'],
    ['05-08', 'S', 'Jacksonville, FL', 'VyStar Veterans Memorial Arena'], ['05-11', 'R', 'Knoxville, TN', 'Thompson-Boling Arena'],
    ['05-15', 'S', 'Columbia, SC', 'Colonial Life Arena'], ['05-18', 'R', 'Greensboro, NC', 'First Horizon Coliseum'],
    ['05-22', 'S', 'Lexington, KY', 'Rupp Arena'], ['06-15', 'R', 'Baltimore, MD', 'CFG Bank Arena'],
    ['06-19', 'S', 'Kansas City, MO', 'T-Mobile Center'],
  ]),
  ...wweTelevision(corporate + '2026/05-07-2026-0', [
    ['06-29', 'RS', 'Atlantic City, NJ', 'Jim Whelan Boardwalk Hall'], ['07-06', 'R', 'Chicago, IL', 'Allstate Arena'],
    ['07-10', 'S', 'Oklahoma City, OK', 'Paycom Center'], ['07-13', 'R', 'Dallas, TX', 'American Airlines Center'],
    ['07-17', 'S', 'Albany, NY', 'MVP Arena'], ['07-20', 'R', 'Detroit, MI', 'Little Caesars Arena'],
    ['07-24', 'S', 'Oakland, CA', 'Oakland Arena'], ['07-27', 'R', 'Inglewood, CA', 'Intuit Dome'],
    ['07-31', 'S', 'Green Bay, WI', 'Resch Center'], ['08-03', 'R', 'Des Moines, IA', 'Casey’s Center'],
    ['08-10', 'R', 'Norfolk, VA', 'Scope Arena'], ['08-17', 'R', 'Buffalo, NY', 'KeyBank Center'],
    ['08-28', 'S', 'Cleveland, OH', 'Rocket Arena'], ['08-31', 'R', 'Charlotte, NC', 'Spectrum Center'],
    ['09-04', 'S', 'Cincinnati, OH', 'Heritage Bank Center'], ['09-07', 'R', 'Birmingham, AL', 'Legacy Arena at BJCC'],
  ]),
  ...wweTelevision(corporate + '2026/09-08-2026', [
    ['11-09', 'R', 'Greenville, SC', 'Bon Secours Wellness Arena'], ['11-13', 'S', 'Sunrise, FL', 'Amerant Bank Arena'],
    ['11-16', 'R', 'Raleigh, NC', 'Lenovo Center'], ['11-20', 'S', 'Evansville, IN', 'Ford Center'],
    ['11-23', 'RS', 'Wichita, KS', 'Intrust Bank Arena'], ['11-30', 'R', 'Little Rock, AR', 'Simmons Bank Arena'],
    ['12-04', 'S', 'Grand Rapids, MI', 'Van Andel Arena'], ['12-07', 'R', 'Toledo, OH', 'Huntington Center'],
  ]),
]

function wweSpecial(day: string, name: string, source: string, city: string, venue?: string) {
  return event('raw', day, name, source, { city, venue, guestPromotions: ['smackdown'] })
}

function nxt(day: string, name: string, path: string, city = 'Orlando, FL', venue = 'WWE Performance Center', regular = false) {
  return event('nxt', day, name, wwe + path, { city, venue, regular })
}

const aewWeekly = (day: string, name: string, city: string, venue?: string, source = aewDates) =>
  event('aew', day, name, source, { city, venue, regular: true })

const njpwSeries = (name: string, source: string, dates: readonly (readonly [string, string, string?])[]) =>
  dates.map(([date, city, venue], index) => event('njpw', date, name + (index === dates.length - 1 ? ' · Final' : ''), source,
    { city, venue, regular: index < dates.length - 1 }))

const bwfRecord = (day: string, name: string, city: string, venue?: string, regular = false) =>
  event('bwf', day, name, SOURCES.bwfArchive, { city, venue, documented: true, regular })

export const CALENDAR_REFERENCES_2026: readonly CalendarReference[] = [
  ...wweTour,
  ...wweTelevision(wwe + '/article/wwe-announces-14-event-dates-across-the-united-states', [
    ['09-18', 'S', 'Corpus Christi, TX', 'Hilliard Center'], ['09-21', 'R', 'San Antonio, TX', 'Frost Bank Center'],
    ['09-28', 'R', 'Milwaukee, WI', 'Fiserv Forum'], ['10-02', 'S', 'Denver, CO', 'Ball Arena'],
    ['10-05', 'R', 'St. Louis, MO', 'Enterprise Center'], ['10-12', 'R', 'Bossier City, LA', 'Brookshire Grocery Arena'],
    ['10-16', 'S', 'Sacramento, CA', 'Golden 1 Center'], ['10-19', 'R', 'San Diego, CA', 'Pechanga Arena'],
    ['10-26', 'R', 'Fresno, CA', 'Save Mart Center'], ['11-02', 'R', 'Brooklyn, NY', 'Barclays Center'],
  ]),
  event('smackdown', '01-02', 'WWE SmackDown', wwe + '/shows/smackdown/2026-01-02', { regular: true }),
  event('raw', '01-05', 'Raw · Stranger Things', wwe + '/shows/raw/2026-01-05', { city: 'Brooklyn, NY', venue: 'Barclays Center', regular: true }),
  event('smackdown', '01-09', 'SmackDown · Three Stages of Hell', wwe + '/shows/smackdown/archive', { regular: true }),
  event('smackdown', '01-30', 'WWE SmackDown', SOURCES.royalRumble, { city: 'Riad, Arábia Saudita', venue: 'KAFD', regular: true }),
  wweSpecial('01-31', 'WWE Royal Rumble', SOURCES.royalRumble, 'Riad, Arábia Saudita', 'Riyadh Season Stadium at KAFD'),
  wweSpecial('02-28', 'WWE Elimination Chamber', SOURCES.eliminationChamber, 'Chicago, IL', 'United Center'),
  wweSpecial('04-18', 'WrestleMania 42 · Noite 1', SOURCES.wrestleMania, 'Las Vegas, NV', 'Allegiant Stadium'),
  wweSpecial('04-19', 'WrestleMania 42 · Noite 2', SOURCES.wrestleMania, 'Las Vegas, NV', 'Allegiant Stadium'),
  wweSpecial('05-09', 'WWE Backlash', corporate + '2026/02-02-2026', 'Tampa, FL', 'Benchmark International Arena'),
  wweSpecial('05-31', 'WWE Clash in Italy', corporate + '2026/02-18-2026', 'Turim, Itália', 'Inalpi Arena'),
  wweSpecial('06-27', 'WWE Night of Champions', corporate + '2026/04-23-2026', 'Riad, Arábia Saudita', 'Kingdom Arena'),
  wweSpecial('08-01', 'WWE SummerSlam · Noite 1', SOURCES.summerSlam, 'Minneapolis, MN', 'U.S. Bank Stadium'),
  wweSpecial('08-02', 'WWE SummerSlam · Noite 2', SOURCES.summerSlam, 'Minneapolis, MN', 'U.S. Bank Stadium'),
  wweSpecial('10-10', 'WWE Money in the Bank', corporate + '2026/06-08-2026', 'Nova Orleans, LA', 'Smoothie King Center'),
  wweSpecial('11-07', 'WWE Crown Jewel', wwe + '/shows/crownjewel/2026/results', 'Riad, Arábia Saudita', 'Riyadh Season Stadium at KAFD'),
  wweSpecial('11-28', 'WWE Survivor Series: WarGames', corporate + '2026/07-13-2026', 'Houston, TX', 'Daikin Park'),
  wweSpecial('12-12', 'WWE Wrestlepalooza', wweUpcoming, 'Perth, Austrália', 'RAC Arena'),
  nxt('01-06', 'NXT New Year’s Evil', '/shows/wwenxt/2026-01-06'),
  nxt('03-07', 'NXT Vengeance Day', '/shows/nxtple/vengeance-day-2026'),
  nxt('04-04', 'NXT Stand & Deliver', '/article/st-louis-to-host-nxt-stand-deliver-on-saturday-april-4', 'St. Louis, MO', 'The Factory at The District'),
  nxt('06-28', 'NXT Great American Bash', '/shows/nxtple/archive'),
  nxt('08-30', 'NXT Heatwave', '/article/edinburg-texas-to-host-nxt-heatwave-lucha-libre-aaa-on-sunday-aug-30', 'Edinburg, TX', 'Bert Ogden Arena'),
  nxt('10-28', 'NXT Halloween Havoc', '/shows/nxtple/nxt-halloween-havoc-2026'),
  nxt('10-20', 'WWE NXT', '/article/wwe-upcoming-events', 'Orlando, FL', 'WWE Performance Center', true),

  event('aew', '01-14', 'AEW Dynamite · Maximum Carnage', aew + '/post/aew-dynamite-results-january-14-2026', { regular: true }),
  event('aew', '01-17', 'AEW Collision · Maximum Carnage', SOURCES.aewOpps, { regular: true }),
  event('aew', '03-15', 'AEW Revolution', aew + '/post/aew-revolution-2026-preview', { city: 'Los Angeles, CA', venue: 'Crypto.com Arena' }),
  event('aew', '04-12', 'AEW Dynasty', aew + '/post/aew-dynasty-2026-preview', { city: 'Vancouver, Canadá', venue: 'Rogers Arena' }),
  event('aew', '05-24', 'AEW Double or Nothing', aew + '/post/louis-armstrong-stadium-to-host-aew-double-or-nothing-sunday-may-24',
    { city: 'Queens, NY', venue: 'Louis Armstrong Stadium' }),
  event('aew', '06-28', 'AEW × NJPW Forbidden Door', aew + '/post/aew-x-njpw-forbidden-door-results-june-28-2026',
    { city: 'San José, CA', venue: 'SAP Center', guestPromotions: ['njpw'] }),
  event('aew', '08-30', 'AEW All In: London', SOURCES.aewAllIn, { city: 'Londres, Reino Unido', venue: 'Wembley Stadium' }),
  event('aew', '09-26', 'AEW All Out', aew + '/post/aew-all-out-2026-preview', { city: 'Hoffman Estates, IL', venue: 'NOW Arena' }),
  aewWeekly('10-14', 'AEW Dynamite e Collision', '', undefined, aew + '/post/aew-dynamite-collision-results-october-14-2026'),
  event('aew', '10-17', 'AEW WrestleDream', aew + '/post/aew-wrestledream-2026-preview', { city: 'Orlando, FL', venue: 'Addition Financial Arena' }),
  event('aew', '11-11', 'AEW Dynamite e Collision', aew + '/post/aew-dynamite-collision-results-november-11-2026', { regular: true }),
  event('aew', '11-14', 'AEW Full Gear', aew + '/post/aew-full-gear-results-november-14-2026', { city: 'Phoenix, AZ', venue: 'Mortgage Matchup Center' }),
  aewWeekly('11-18', 'AEW Dynamite · Continental Classic', 'Denver, CO', undefined, aew + '/aew-event/aew-dynamite-denver'),
  aewWeekly('11-21', 'AEW Collision', 'Green Bay, WI', 'Resch Center'),
  aewWeekly('11-25', 'AEW Dynamite e Collision', 'Omaha, NE', 'Liberty First Credit Union Arena'),
  aewWeekly('12-02', 'AEW Dynamite', 'Laredo, TX', 'Sames Auto Arena'),
  aewWeekly('12-05', 'AEW Collision', 'San Antonio, TX', 'Boeing Center at Tech Port', aew + '/aew-event/aew-collision-san-antonio'),
  aewWeekly('12-09', 'AEW Dynamite e Collision · Winter Is Coming', 'Monterrey, México', 'Arena Monterrey',
    aew + '/aew-event/aew-dynamite-collision-winter-is-coming'),
  aewWeekly('12-16', 'AEW Dynamite e Collision', 'Oklahoma City, OK', 'Paycom Center', aew + '/aew-event/aew-dynamite-collision-oklahoma-city'),
  event('aew', '12-19', 'AEW Worlds End', aewDates, { city: 'Minneapolis, MN', venue: 'Target Center' }),
  aewWeekly('12-23', 'AEW Dynamite e Collision', 'Chicago, IL', 'Wintrust Arena'),

  event('njpw', '01-04', 'Wrestle Kingdom 20', SOURCES.njpwWk20, { city: 'Tóquio, Japão', venue: 'Tokyo Dome' }),
  event('njpw', '01-05', 'NJPW New Year Dash', SOURCES.njpwDash, { city: 'Tóquio, Japão', venue: 'Ota City General Gymnasium' }),
  event('njpw', '02-11', 'NJPW The New Beginning in Osaka', njpw + '/625027', { city: 'Osaka, Japão', venue: 'EDION Arena Osaka' }),
  event('njpw', '03-12', 'NJPW New Japan Cup', njpw + '/news/topics/2026?page=12', { regular: true }),
  event('njpw', '03-17', 'NJPW New Japan Cup', njpw + '/news/2026?page=11', { regular: true }),
  event('njpw', '03-21', 'NJPW New Japan Cup · Final', njpw + '/tornament/card/621413', { city: 'Nagaoka, Japão', venue: 'Ao-re Nagaoka' }),
  event('njpw', '04-04', 'NJPW Sakura Genesis', njpw + '/637038', { city: 'Tóquio, Japão', venue: 'Ryogoku Sumo Hall' }),
  event('njpw', '05-03', 'NJPW Wrestling Dontaku · Noite 1', njpw + '/result?page=4', { city: 'Fukuoka, Japão' }),
  event('njpw', '05-04', 'NJPW Wrestling Dontaku · Noite 2', njpw + '/result?page=4', { city: 'Fukuoka, Japão' }),
  ...njpwSeries('NJPW Best of the Super Jr. 33', njpw + '/637041', [
    ['05-14', 'Japão'], ['05-16', 'Japão'], ['05-17', 'Japão'], ['05-20', 'Japão'], ['05-22', 'Japão'],
    ['05-23', 'Himeji, Japão', 'Arcrea Himeji'], ['05-24', 'Japão'], ['05-30', 'Takaoka, Japão', 'Takaoka Techno Dome'],
    ['06-02', 'Japão'], ['06-07', 'Tóquio, Japão', 'Ota City General Gymnasium'],
  ]),
  event('njpw', '05-16', 'NJPW TAMASHII · disputa de duplas', SOURCES.njpwTamashiiMay, { regular: true, series: 'tamashii', documented: true }),
  event('njpw', '06-14', 'NJPW Dominion', 'https://shop.njpw1972.com/collections/dominion-2026', { city: 'Osaka, Japão', venue: 'Osaka-jō Hall' }),
  ...njpwSeries('NJPW G1 Climax 36', njpw + '/657522/', [
    ['07-11', 'Chicago, IL'], ['07-19', 'Sapporo, Japão', 'Hokkai Kitayell'], ['07-31', 'Takamatsu, Japão', 'Takamatsu City Gymnasium'],
    ['08-09', 'Gunma, Japão', 'G Messe Gunma'], ['08-11', 'Tsu, Japão', 'Nissho Highway Arena'], ['08-12', 'Hamamatsu, Japão'],
    ['08-13', 'Japão'], ['08-15', 'Tóquio, Japão', 'Ryogoku Sumo Hall'], ['08-16', 'Tóquio, Japão', 'Ryogoku Sumo Hall'],
  ]),
  event('njpw', '10-12', 'NJPW King of Pro-Wrestling', njpw + '/tornament/result/662775', { city: 'Tóquio, Japão', venue: 'Ryogoku Sumo Hall' }),
  event('njpw', '11-03', 'NJPW Power Struggle', njpw + '/tornament/result/662785'),

  event('tna', '01-01', 'TNA iMPACT!', SOURCES.tnaJanuary, { regular: true, broadcast: true }),
  event('tna', '01-15', 'TNA iMPACT! — estreia no AMC', SOURCES.tnaDallas, { city: 'Dallas, TX', venue: 'Curtis Culwell Center', regular: true }),
  event('tna', '01-17', 'TNA Genesis', SOURCES.tnaDallas, { city: 'Dallas, TX', venue: 'Curtis Culwell Center' }),
  event('tna', '03-27', 'TNA Sacrifice', tna + '/news/tna-sacrifice-2026-live-results', { city: 'Westwego, LA', venue: 'Alario Center' }),
  event('tna', '04-11', 'TNA Rebellion', tna + '/news/tna-rebellion-2026-live-results', { city: 'Cleveland, OH', venue: 'Wolstein Center' }),
  event('tna', '04-30', 'TNA iMPACT!', tna + '/news/tna-thursday-night-impact-on-amc-results-april-30-2026', { regular: true, broadcast: true }),
  event('tna', '05-14', 'TNA iMPACT!', tna + '/news/tna-thursday-night-impact-on-amc-live-results-may-14-2026', { regular: true, broadcast: true }),
  event('tna', '06-28', 'TNA Slammiversary', tna + '/events/slammiversary-June-28-2026', { city: 'Boston, MA', venue: 'Agganis Arena' }),
  event('tna', '07-02', 'TNA iMPACT! · Albany', tnaSchedule, { city: 'Albany, NY', venue: 'Broadview Center', regular: true }),
  event('tna', '07-30', 'TNA iMPACT! · Filadélfia', tnaSchedule, { city: 'Filadélfia, PA', venue: 'Liacouras Center', regular: true }),
  event('tna', '08-23', 'TNA Lockdown', tna + '/news/tna-lockdown-2026', { city: 'Chicago, IL', venue: 'Credit Union 1 Arena' }),
  event('tna', '08-27', 'TNA iMPACT! · final do Knockouts TV', SOURCES.tnaTv, { city: 'Brampton, Canadá', venue: 'CAA Centre', regular: true }),
  event('tna', '09-24', 'TNA iMPACT! · San Antonio', tnaSchedule, { city: 'San Antonio, TX', venue: 'Boeing Center at Tech Port', regular: true }),
  event('tna', '10-11', 'TNA Bound for Glory', tna + '/events/bound-for-glory-Tampa-October-11-2026', { city: 'Tampa, FL', venue: 'Yuengling Center' }),
  event('tna', '11-05', 'TNA Thursday Night iMPACT!', SOURCES.tnaNov, { regular: true, broadcast: true }),
  event('tna', '11-15', 'TNA Destination X', tna + '/news/ticket-onsale-details-for-final-tna-wrestling-events-in-2026-edmonton-calgary-el-paso',
    { city: 'Edmonton, Canadá', venue: 'Edmonton Expo Centre' }),
  event('tna', '11-19', 'TNA iMPACT! · Calgary', tna + '/news/ticket-onsale-details-for-final-tna-wrestling-events-in-2026-edmonton-calgary-el-paso',
    { city: 'Calgary, Canadá', venue: 'WinSport Event Centre', regular: true }),
  event('tna', '12-17', 'TNA iMPACT! · El Paso', tnaSchedule, { city: 'El Paso, TX', venue: 'El Paso County Coliseum', regular: true }),

  event('aaa', '01-17', 'Lucha Libre AAA · estreia na FOX', wwe + '/shows/aaa/full-lucha-libre-aaa-results-jan-17-2026', { regular: true, broadcast: true }),
  event('aaa', '01-24', 'Lucha Libre AAA', wwe + '/shows/aaa/lucha-libre-aaa-jan-24-2026/results', { regular: true, broadcast: true }),
  event('aaa', '03-14', 'AAA Rey de Reyes · Semana 1', wwe + '/shows/aaa/aaa-rey-de-reyes-march-14-2026/results'),
  event('aaa', '03-21', 'AAA Rey de Reyes · Semana 2', wwe + '/shows/aaa/aaa-rey-de-reyes-week-2-march-21-2026/results', { broadcast: true }),
  event('aaa', '05-30', 'AAA Noche de Los Grandes · Semana 1', wwe + '/article/noche-de-los-grandes-results'),
  event('aaa', '06-06', 'AAA Noche de Los Grandes · Semana 2', wwe + '/article/aaa-noche-de-los-grandes-results-june-6-2026', { broadcast: true }),
  event('aaa', '07-25', 'AAA Verano de Escándalo · Semana 1', wwe + '/shows/aaa/lucha-libre-aaa-results-july-25-2026', { city: 'Aguascalientes, México' }),
  event('aaa', '08-01', 'AAA Verano de Escándalo · Semana 2', wwe + '/shows/aaa/lucha-libre-aaa-aug-1-2026', { broadcast: true }),
  event('aaa', '08-30', 'Lucha Libre AAA · Edinburg', corporate + '2026/06-29-2026', { city: 'Edinburg, TX', venue: 'Bert Ogden Arena', regular: true }),
  event('aaa', '09-11', 'AAA Triplemanía 34 · Noite 1', wwe + '/article/first-ever-triplemania-event-in-las-vegas-moves-to-iconic-mgm-grand-garden-arena',
    { city: 'Las Vegas, NV', venue: 'MGM Grand Garden Arena' }),
  event('aaa', '09-13', 'AAA Triplemanía 34 · Noite 2', wwe + '/event/triplemania-34', { city: 'Cidade do México, México', venue: 'Arena CDMX' }),
  event('aaa', '09-26', 'WWE × AAA Worlds Collide', wwe + '/article/wwe-announces-14-event-dates-across-the-united-states',
    { city: 'Rosemont, IL', venue: 'Allstate Arena', guestPromotions: ['raw', 'smackdown'] }),
  event('aaa', '10-24', 'AAA Héroes Inmortales', wwe + '/event/aaa-heroes-immortales',
    { city: 'Cidade do México, México', venue: 'Gimnasio Olímpico Juan de la Barrera' }),
  event('aaa', '10-31', 'AAA Héroes Inmortales · Semana 2', wwe + '/shows/aaa/aaa-h%C3%A9roes-inmortales-week-2-results-oct-31-2026',
    { regular: true, broadcast: true }),
  event('aaa', '12-19', 'AAA Guerra de Titanes', wweUpcoming, { city: 'Guadalajara, México', venue: 'Arena Guadalajara' }),

  event('roh', '05-15', 'ROH Supercard of Honor', roh + '/?page=2', { city: 'Salisbury, MD', venue: 'Wicomico Civic Center' }),
  event('roh', '08-21', 'ROH Death Before Dishonor', 'https://www.cagematch.net/?id=1&nr=457615',
    { city: 'Filadélfia, PA', venue: '2300 Arena', documented: true }),
  event('roh', '11-05', 'ROH on HonorClub', 'https://prowrestling.net/site/2026/11/06/roh-on-honorclub-results-11-5-eddie-kingston-and-ortiz-vs-trent-beretta-and-rocky-romero-roh-pure-champion-lee-moriarty-vs-ar-fox-in-a-proving-ground-match/',
    { regular: true, documented: true, broadcast: true }),
  event('roh', '12-04', 'ROH Final Battle', roh + '/events/roh-final-battle', { city: 'San Antonio, TX', venue: 'Boeing Center at Tech Port' }),

  bwfRecord('02-28', 'BWF In House 31', 'São Paulo, SP'),
  bwfRecord('03-29', 'BWF Telecatch na Band · gravação', 'São Paulo, SP', 'Clube 7 de Setembro', true),
  bwfRecord('04-19', 'BWF Expo Culturas Unidas', 'Mauá, SP'),
  bwfRecord('04-26', 'BWF Arnold Sports Festival South America', 'São Paulo, SP'),
  bwfRecord('05-02', 'BWF Telecatch na Band · gravação', 'São Paulo, SP', undefined, true),
  bwfRecord('05-09', 'BWF Telecatch na Band · gravação', 'Taubaté, SP', undefined, true),
  bwfRecord('05-16', 'BWF Telecatch na Band · gravação', 'Pilar do Sul, SP', undefined, true),
  bwfRecord('06-06', 'BWF Telecatch na Band · gravação', 'São Paulo, SP', undefined, true),
  bwfRecord('06-21', 'BWF Fábrica de Cultura Itaim Paulista', 'São Paulo, SP'),
  bwfRecord('06-28', 'BWF Fábrica de Cultura Santos', 'Santos, SP'),
  bwfRecord('07-02', 'BWF Anime Friends · Dia 1', 'São Paulo, SP'),
  bwfRecord('07-03', 'BWF Anime Friends · Dia 2', 'São Paulo, SP'),
  bwfRecord('09-19', 'BWF Telecatch na Band · gravação', 'São Paulo, SP', 'Centro Esportivo Salim Farah Maluf', true),
  bwfRecord('10-31', 'BWF Dia de Los Muertos · Dia 1', 'São Paulo, SP'),
]

export const REPLACED_RECURRING_DATES: Readonly<Partial<Record<PromotionId, readonly string[]>>> = {
  smackdown: ['2026-07-03', '2026-11-27'],
  aew: ['2026-11-28', '2026-12-12', '2026-12-26'],
  njpw: ['2026-05-17'],
}
