import { z } from 'zod'
import { ORGANIZATIONS, ROSTER_BY_ID, TITLES_BY_ID, compareShows, nextShows, showPromotions, validLegacyShow, wrestlerAppearsIn } from '../content/catalog'
import { validMoveset } from '../content/moves'
import { DATA_VERSION, LEGACY_DATA_VERSION, START_DATE, SAVE_VERSION, addDays, careerSchema, type Career } from '../domain/model'
import { PLAYER_ID } from '../engine/career'
import { validAction } from '../engine/combat'
import { showSupportsTitle, titleEligible, titleStates } from '../engine/titles'

function unique(ids: string[]): boolean {
  return new Set(ids).size === ids.length
}

const legacySchema = z.looseObject({
  schemaVersion: z.literal(1), dataVersion: z.literal(LEGACY_DATA_VERSION), date: z.string(),
})

function migrate(input: unknown): unknown {
  const legacy = legacySchema.safeParse(input)
  if (!legacy.success) return input
  return { ...legacy.data, schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, expandedOn: legacy.data.date, vacatedTitles: [] }
}

export function validateCareer(input: unknown): Career {
  const parsed = careerSchema.safeParse(migrate(input))
  if (!parsed.success) throw new Error('A estrutura da carreira é inválida ou usa uma versão incompatível.')
  const career = parsed.data
  const { profile, bout, contract, shows, ledger, history, expandedOn, vacatedTitles } = career
  if (
    !validMoveset(profile.moves) || Object.keys(profile.moveLevels).some(id => !profile.moves.includes(id))
    || career.date < START_DATE || career.worldThrough < addDays(START_DATE, -1) || career.worldThrough > career.date
    || career.date !== (career.worldThrough < START_DATE ? START_DATE : career.worldThrough)
    || !unique(career.offers.map(offer => offer.id))
    || !unique(career.offers.map(offer => ORGANIZATIONS[offer.promotion].company))
    || !unique(shows.map(show => show.id)) || !unique(ledger.map(item => item.id)) || !unique(history.map(item => item.id))
    || history.some(item => item.date < START_DATE || item.date > career.date)
    || (expandedOn && (expandedOn < START_DATE || expandedOn > career.date))
    || vacatedTitles.some((item, index) => item.date < START_DATE || item.date > career.date || (index > 0 && vacatedTitles[index - 1].date > item.date))
    || !unique(vacatedTitles.map(item => item.titleId + '@' + item.date))
    || (contract && (contract.start < START_DATE || contract.start > career.date || contract.end !== addDays(contract.start, contract.weeks * 7)
      || ((contract.end > career.date) !== (contract.status === 'active'))))
    || (contract?.status === 'active' && career.offers.length > 0)
  ) throw new Error('Os registros da carreira estão inconsistentes.')

  const matchIds = new Set<string>()
  const playerMatchDates = new Map<string, string>()
  const bookedByDate = new Map<string, Set<string>>()
  for (const [index, show] of shows.entries()) {
    const expected = nextShows(show.promotion, addDays(show.date, -1), 1)[0]
    const matchesSchedule = show.id === expected.id && show.name === expected.name && show.origin === expected.origin
      && show.special === expected.special && (show.guestPromotions ?? []).join(',') === (expected.guestPromotions ?? []).join(',')
    const legacySchedule = expandedOn && show.date <= expandedOn && show.id === show.promotion + '@' + show.date && validLegacyShow(show)
    if (
      show.date < START_DATE || show.date > career.worldThrough || (!matchesSchedule && !legacySchedule)
      || show.matches.length > 3 || (index > 0 && compareShows(shows[index - 1], show) >= 0)
    ) throw new Error('Há um evento inválido no calendário.')
    const participants = bookedByDate.get(show.date) ?? new Set<string>()
    bookedByDate.set(show.date, participants)
    const circuits = showPromotions(show)
    for (const match of show.matches) {
      const first = ROSTER_BY_ID.get(match.firstId)
      const second = ROSTER_BY_ID.get(match.secondId)
      const firstEligible = match.player ? match.firstId === PLAYER_ID : first && circuits.some(promotion => wrestlerAppearsIn(first, promotion))
      if (
        !firstEligible || !second || !circuits.some(promotion => wrestlerAppearsIn(second, promotion))
        || (match.player ? profile.division : first?.division) !== second.division
        || ![match.firstId, match.secondId].includes(match.winnerId) || match.firstId === match.secondId || match.rounds < 1
        || matchIds.has(match.id) || participants.has(match.firstId) || participants.has(match.secondId)
        || !match.id.startsWith(show.id + '/') || (match.player !== (match.id === show.id + '/career'))
      ) throw new Error('Há uma luta inválida, duplicada ou com conflito de agenda no save.')
      matchIds.add(match.id)
      participants.add(match.firstId)
      participants.add(match.secondId)
      if (match.player) playerMatchDates.set(match.id, show.date)
    }
  }
  if (ledger.length !== playerMatchDates.size || ledger.some(item => playerMatchDates.get(item.id) !== item.date)) {
    throw new Error('O histórico financeiro não corresponde às lutas da carreira.')
  }

  const belts = titleStates(career)
  if (bout) {
    const show = shows.find(item => item.id === bout.showId)
    const rival = ROSTER_BY_ID.get(bout.rivalId)
    const result = show?.matches.find(item => item.id === bout.id)
    if (
      !show || !rival || !showPromotions(show).some(promotion => wrestlerAppearsIn(rival, promotion))
      || rival.division !== profile.division || bout.id !== show.id + '/career'
      || !validAction(bout.plan) || bout.used.length !== bout.turn || bout.used.some(action => !validAction(action))
      || bout.log.some(item => item.turn > bout.turn)
      || (bout.finish && (!result || result.secondId !== rival.id || result.winnerId !== (bout.finish.winner === 'player' ? PLAYER_ID : rival.id)
        || result.titleId !== bout.titleId || result.method !== bout.finish.method || result.rounds !== bout.turn || bout.xpAwarded === 0))
      || (!bout.finish && (show.date !== career.date || contract?.status !== 'active' || !showPromotions(show).includes(contract.promotion)
        || result || bout.xpAwarded !== 0 || bookedByDate.get(show.date)?.has(rival.id)))
    ) throw new Error('O estado da luta não corresponde ao calendário.')
    if (!bout.finish && bout.titleId) {
      const title = TITLES_BY_ID.get(bout.titleId)
      const belt = belts.get(bout.titleId)
      if (!title || !belt || title.promotion !== contract?.promotion || !showSupportsTitle(show, title) || !titleEligible(career, title, rival.id)
        || (belt.holderId !== null && belt.holderId !== PLAYER_ID && belt.holderId !== rival.id)) {
        throw new Error('A disputa de cinturão em andamento é inválida.')
      }
    }
  }
  return career
}

const envelopeSchema = z.object({
  format: z.literal('wrestling-legacy'),
  version: z.literal([1, SAVE_VERSION]),
  career: z.looseObject({ schemaVersion: z.literal([1, SAVE_VERSION]) }),
})

export function exportCareer(career: Career): string {
  return JSON.stringify({ format: 'wrestling-legacy', version: SAVE_VERSION, career }, null, 2)
}

export function importCareer(text: string, id = crypto.randomUUID()): Career {
  let content: unknown
  try {
    content = JSON.parse(text)
  } catch {
    throw new Error('O arquivo precisa conter um save JSON válido.')
  }
  const envelope = envelopeSchema.safeParse(content)
  if (!envelope.success || envelope.data.version !== envelope.data.career.schemaVersion) {
    throw new Error('O formato ou a versão do save é incompatível.')
  }
  const career = validateCareer(envelope.data.career)
  return { ...career, id, revision: 0, createdAt: Date.now() }
}
