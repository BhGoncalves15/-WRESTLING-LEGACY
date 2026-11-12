import { z } from 'zod'
import { ROSTER_BY_ID, nextShows } from '../content/catalog'
import { validMoveset } from '../content/moves'
import { START_DATE, SAVE_VERSION, addDays, careerSchema, type Career } from '../domain/model'
import { PLAYER_ID } from '../engine/career'
import { validAction } from '../engine/combat'

function unique(ids: string[]): boolean {
  return new Set(ids).size === ids.length
}

export function validateCareer(input: unknown): Career {
  const parsed = careerSchema.safeParse(input)
  if (!parsed.success) throw new Error('A estrutura da carreira é inválida ou usa uma versão incompatível.')
  const career = parsed.data
  const { profile, bout, contract, shows, ledger, history } = career
  if (
    !validMoveset(profile.moves) || Object.keys(profile.moveLevels).some(id => !profile.moves.includes(id))
    || career.date < START_DATE || career.worldThrough < addDays(START_DATE, -1) || career.worldThrough > career.date
    || career.date !== (career.worldThrough < START_DATE ? START_DATE : career.worldThrough)
    || !unique(career.offers.map(offer => offer.id)) || !unique(career.offers.map(offer => offer.promotion))
    || !unique(shows.map(show => show.id)) || !unique(ledger.map(item => item.id)) || !unique(history.map(item => item.id))
    || history.some(item => item.date < START_DATE || item.date > career.date)
    || (contract && (contract.start < START_DATE || contract.start > career.date || contract.end !== addDays(contract.start, contract.weeks * 7)
      || ((contract.end > career.date) !== (contract.status === 'active'))))
    || (contract?.status === 'active' && career.offers.length > 0)
  ) throw new Error('Os registros da carreira estão inconsistentes.')

  const matchIds = new Set<string>()
  const playerMatchIds = new Set<string>()
  for (const show of shows) {
    const expected = nextShows(show.promotion, addDays(show.date, -1), 1)[0]
    if (
      show.date < START_DATE || show.date > career.worldThrough || show.id !== expected.id || show.name !== expected.name
      || show.origin !== expected.origin || show.special !== expected.special || show.matches.length < 2 || show.matches.length > 3
    ) throw new Error('Há um evento inválido no calendário.')
    const participants = new Set<string>()
    for (const match of show.matches) {
      const first = ROSTER_BY_ID.get(match.firstId)
      const second = ROSTER_BY_ID.get(match.secondId)
      const firstEligible = match.player ? match.firstId === PLAYER_ID : first?.promotion === show.promotion
      if (
        !firstEligible || second?.promotion !== show.promotion || (match.player ? profile.division : first?.division) !== second?.division
        || ![match.firstId, match.secondId].includes(match.winnerId) || match.firstId === match.secondId || match.rounds < 1
        || matchIds.has(match.id) || participants.has(match.firstId) || participants.has(match.secondId)
        || !match.id.startsWith(show.id + '/') || (match.player !== (match.id === show.id + '/career'))
      ) throw new Error('Há uma luta inválida ou duplicada no save.')
      matchIds.add(match.id)
      participants.add(match.firstId)
      participants.add(match.secondId)
      if (match.player) playerMatchIds.add(match.id)
    }
  }
  if (ledger.length !== playerMatchIds.size || ledger.some(item => !playerMatchIds.has(item.id) || item.date > career.date)) {
    throw new Error('O histórico financeiro não corresponde às lutas da carreira.')
  }
  if (bout) {
    const show = shows.find(item => item.id === bout.showId)
    const rival = ROSTER_BY_ID.get(bout.rivalId)
    const result = show?.matches.find(item => item.id === bout.id)
    if (
      !show || !rival || rival.promotion !== show.promotion || rival.division !== profile.division || bout.id !== show.id + '/career'
      || !validAction(bout.plan) || bout.used.length !== bout.turn || bout.used.some(action => !validAction(action))
      || bout.log.some(item => item.turn > bout.turn)
      || (bout.finish && (!result || result.secondId !== rival.id || result.winnerId !== (bout.finish.winner === 'player' ? PLAYER_ID : rival.id)
        || result.method !== bout.finish.method || result.rounds !== bout.turn || bout.xpAwarded === 0))
      || (!bout.finish && (show.date !== career.date || contract?.status !== 'active' || contract.promotion !== show.promotion || result || bout.xpAwarded !== 0))
    ) throw new Error('O estado da luta não corresponde ao calendário.')
  }
  return career
}

const envelopeSchema = z.object({
  format: z.literal('wrestling-legacy'),
  version: z.literal(SAVE_VERSION),
  career: z.unknown(),
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
  if (!envelope.success) throw new Error('O formato ou a versão do save é incompatível.')
  const career = validateCareer(envelope.data.career)
  return { ...career, id, revision: 0, createdAt: Date.now() }
}
