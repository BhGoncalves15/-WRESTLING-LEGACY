import { z } from 'zod'
import { ORGANIZATIONS, ROSTER_BY_ID, TITLES_BY_ID, compareShows, nextShows, showPromotions, validLegacyShow, wrestlerAppearsIn } from '../content/catalog'
import { validMoveset } from '../content/moves'
import { supportsTagDefense } from '../content/titles'
import { DATA_VERSION, LEGACY_DATA_VERSION, START_DATE, SAVE_VERSION, WORLD_DATA_VERSION, addDays, careerSchema, type Career, type PromotionId } from '../domain/model'
import { PLAYER_ID } from '../engine/career'
import { validAction } from '../engine/combat'
import { matchTeams, sameTeam } from '../engine/matches'
import { TAG_ACTIONS, isTagBout, legalFighterId, tagSwapUnavailable } from '../engine/tag-combat'
import { showSupportsTitle, titleEligible, titleStates } from '../engine/titles'

function unique(ids: string[]): boolean {
  return new Set(ids).size === ids.length
}

const legacySchema = z.looseObject({
  schemaVersion: z.literal(1), dataVersion: z.literal(LEGACY_DATA_VERSION), date: z.string(),
})
const worldSchema = z.looseObject({ schemaVersion: z.literal(2), dataVersion: z.literal(WORLD_DATA_VERSION) })

function migrate(input: unknown): unknown {
  const world = worldSchema.safeParse(input)
  if (world.success) return { ...world.data, schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, tagPartnerId: null }
  const legacy = legacySchema.safeParse(input)
  if (!legacy.success) return input
  return { ...legacy.data, schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, expandedOn: legacy.data.date, vacatedTitles: [], tagPartnerId: null }
}

function validLineup(career: Career, circuits: PromotionId[], participants: string[], player: boolean): boolean {
  if (!unique(participants) || player !== (participants[0] === PLAYER_ID)) return false
  const division = player ? career.profile.division : ROSTER_BY_ID.get(participants[0])?.division
  return participants.every((id, index) => {
    if (player && index === 0) return true
    const fighter = ROSTER_BY_ID.get(id)
    return Boolean(fighter && fighter.division === division && circuits.some(promotion => wrestlerAppearsIn(fighter, promotion)))
  })
}

export function validateCareer(input: unknown): Career {
  const parsed = careerSchema.safeParse(migrate(input))
  if (!parsed.success) throw new Error('A estrutura da carreira é inválida ou usa uma versão incompatível.')
  const career = parsed.data
  const { profile, bout, contract, shows, ledger, history, expandedOn, vacatedTitles, tagPartnerId } = career
  const partner = tagPartnerId ? ROSTER_BY_ID.get(tagPartnerId) : undefined
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
    || (tagPartnerId && (!contract || !partner || partner.division !== profile.division || partner.promotion !== contract.promotion))
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
      const members = matchTeams(match).flat()
      if (
        !validLineup(career, circuits, members, match.player)
        || !members.includes(match.winnerId) || match.rounds < 1
        || matchIds.has(match.id) || members.some(id => participants.has(id))
        || !match.id.startsWith(show.id + '/') || (match.player !== (match.id === show.id + '/career'))
      ) throw new Error('Há uma luta inválida, duplicada ou com conflito de agenda no save.')
      matchIds.add(match.id)
      for (const member of members) participants.add(member)
      if (match.player) playerMatchDates.set(match.id, show.date)
    }
  }
  if (ledger.length !== playerMatchDates.size || ledger.some(item => playerMatchDates.get(item.id) !== item.date)) {
    throw new Error('O histórico financeiro não corresponde às lutas da carreira.')
  }

  const belts = titleStates(career)
  for (const [titleId, belt] of belts) {
    if (belt.holders?.length !== 2) continue
    const playerHolds = belt.holders.includes(PLAYER_ID)
    const partnerHolds = tagPartnerId !== null && belt.holders.includes(tagPartnerId)
    if (playerHolds !== partnerHolds || (playerHolds && TITLES_BY_ID.get(titleId)?.promotion !== contract?.promotion)) {
      throw new Error('O reinado de duplas não corresponde à parceria atual.')
    }
  }
  if (bout) {
    const show = shows.find(item => item.id === bout.showId)
    const tag = bout.tag
    const firstTeam = tag ? [PLAYER_ID, tag.player.partnerId] : [PLAYER_ID]
    const secondTeam = tag ? [bout.rivalId, tag.rival.partnerId] : [bout.rivalId]
    const members = [...firstTeam, ...secondTeam]
    const result = show?.matches.find(item => item.id === bout.id)
    const finish = bout.finish
    const winningStarter = finish?.winner === 'player' ? PLAYER_ID : bout.rivalId
    const tagPlan = bout.plan === 'tag' && isTagBout(bout) && (finish || !tagSwapUnavailable(bout, 'rival'))
    if (
      !show || !validLineup(career, showPromotions(show), members, true) || bout.id !== show.id + '/career'
      || (!tagPlan && !validAction(bout.plan)) || bout.used.length !== bout.turn
      || bout.used.some(action => !validAction(action) && !(tag && Object.hasOwn(TAG_ACTIONS, action)))
      || bout.log.some(item => item.turn > bout.turn)
      || (tag && (['player', 'rival'] as const).some(actor => {
        const corner = tag[actor]
        const reserve = corner.partnerLegal ? bout[actor] : corner.partner
        return (corner.lastTagTurn ?? 0) > bout.turn || (corner.partnerLegal && corner.lastTagTurn === null)
          || (corner.saveUsed && bout.turn === 0) || reserve.position !== 'standing'
      }))
      || (finish && (!result || result.secondId !== bout.rivalId || result.tag?.firstPartnerId !== tag?.player.partnerId
        || result.tag?.secondPartnerId !== tag?.rival.partnerId || result.winnerId !== legalFighterId(bout, finish.winner, winningStarter)
        || result.titleId !== bout.titleId || result.method !== finish.method || result.rounds !== bout.turn || bout.xpAwarded === 0))
      || (!finish && (show.date !== career.date || contract?.status !== 'active' || !showPromotions(show).includes(contract.promotion)
        || (tag && tag.player.partnerId !== tagPartnerId) || result || bout.xpAwarded !== 0
        || members.some(id => bookedByDate.get(show.date)?.has(id))))
    ) throw new Error('O estado da luta não corresponde ao calendário.')
    if (!finish && bout.titleId) {
      const title = TITLES_BY_ID.get(bout.titleId)
      const belt = belts.get(bout.titleId)
      const holders = belt?.holders
      if (!title || !belt || title.promotion !== contract?.promotion || !showSupportsTitle(show, title)
        || Boolean(tag) !== supportsTagDefense(title) || !members.every(id => titleEligible(career, title, id))
        || (holders && !sameTeam(holders, firstTeam) && !sameTeam(holders, secondTeam))) {
        throw new Error('A disputa de cinturão em andamento é inválida.')
      }
    }
  }
  return career
}

const envelopeSchema = z.object({
  format: z.literal('wrestling-legacy'),
  version: z.literal([1, 2, SAVE_VERSION]),
  career: z.looseObject({ schemaVersion: z.literal([1, 2, SAVE_VERSION]) }),
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
