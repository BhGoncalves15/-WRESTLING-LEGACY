import { z } from 'zod'
import { ORGANIZATIONS, ROSTER_BY_ID, TITLES_BY_ID, compareShows, nextShows, showPromotions, validLegacyShow, wrestlerAppearsIn } from '../content/catalog'
import { validMoveset } from '../content/moves'
import { defenseSize } from '../content/titles'
import { DATA_VERSION, LEGACY_DATA_VERSION, START_DATE, SAVE_VERSION, TAG_DATA_VERSION, WORLD_DATA_VERSION, addDays, careerSchema, type Career, type PromotionId } from '../domain/model'
import { PLAYER_ID } from '../engine/career'
import { validAction } from '../engine/combat'
import { matchTeams, sameTeam } from '../engine/matches'
import { TAG_ACTIONS, benchSlots, cornerFighterIds, cornerSide, isTagBout, legalFighterId, tagSwapUnavailable, tagTarget } from '../engine/tag-combat'
import { careerTeamPartners } from '../engine/tag-teams'
import { showSupportsTitle, titleEligible, titleStates } from '../engine/titles'

function unique(ids: string[]): boolean {
  return new Set(ids).size === ids.length
}

const legacySchema = z.looseObject({
  schemaVersion: z.literal(1), dataVersion: z.literal(LEGACY_DATA_VERSION), date: z.string(),
})
const worldSchema = z.looseObject({ schemaVersion: z.literal(2), dataVersion: z.literal(WORLD_DATA_VERSION) })
const oldCornerSchema = z.object({
  partnerId: z.string(), partner: z.unknown(), partnerLegal: z.boolean(), lastTagTurn: z.number().nullable(), saveUsed: z.boolean(),
})
const tagSaveSchema = z.looseObject({
  schemaVersion: z.literal(3), dataVersion: z.literal(TAG_DATA_VERSION), tagPartnerId: z.string().nullable(),
  bout: z.looseObject({ tag: z.object({ player: oldCornerSchema, rival: oldCornerSchema }).optional() }).nullable(),
  shows: z.array(z.looseObject({
    matches: z.array(z.looseObject({ tag: z.object({ firstPartnerId: z.string(), secondPartnerId: z.string() }).optional() })),
  })),
})

function migrateTagSave(save: z.infer<typeof tagSaveSchema>) {
  const corner = ({ partnerId, partner, partnerLegal, ...state }: z.infer<typeof oldCornerSchema>) => ({
    ...state, partners: [{ id: partnerId, side: partner }], legalIndex: partnerLegal ? 1 : 0,
  })
  const tag = save.bout?.tag
  return {
    ...save, schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, trioPartnerIds: null,
    preferredFormat: save.tagPartnerId ? 'tag' : 'singles',
    bout: tag ? { ...save.bout, tag: { player: corner(tag.player), rival: corner(tag.rival) } } : save.bout,
    shows: save.shows.map(show => ({
      ...show, matches: show.matches.map(match => match.tag
        ? { ...match, tag: { firstPartners: [match.tag.firstPartnerId], secondPartners: [match.tag.secondPartnerId] } }
        : match),
    })),
  }
}

function migrate(input: unknown): unknown {
  if (!input || typeof input !== 'object' || !('schemaVersion' in input)) return input
  if (input.schemaVersion === 3) {
    const tag = tagSaveSchema.safeParse(input)
    return tag.success ? migrateTagSave(tag.data) : input
  }
  const defaults = { schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, tagPartnerId: null, trioPartnerIds: null, preferredFormat: 'singles' }
  if (input.schemaVersion === 2) {
    const world = worldSchema.safeParse(input)
    return world.success ? { ...world.data, ...defaults } : input
  }
  if (input.schemaVersion !== 1) return input
  const legacy = legacySchema.safeParse(input)
  if (!legacy.success) return input
  return { ...legacy.data, ...defaults, expandedOn: legacy.data.date, vacatedTitles: [] }
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
  const { profile, bout, contract, shows, ledger, history, expandedOn, vacatedTitles, trioPartnerIds, preferredFormat } = career
  const partners = [...careerTeamPartners(career, 'tag'), ...careerTeamPartners(career, 'trios')]
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
    || (trioPartnerIds && !unique(trioPartnerIds))
    || (preferredFormat !== 'singles' && !careerTeamPartners(career, preferredFormat).length)
    || partners.some(id => {
      const fighter = ROSTER_BY_ID.get(id)
      return !contract || !fighter || fighter.division !== profile.division || fighter.promotion !== contract.promotion
    })
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
      const [first, second] = matchTeams(match)
      const members = [...first, ...second]
      if (
        first.length !== second.length || !validLineup(career, circuits, members, match.player)
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
    const holders = belt.holders
    if (!holders || holders.length < 2) continue
    const lineup = careerTeamPartners(career, holders.length === 3 ? 'trios' : 'tag')
    const playerHolds = holders.includes(PLAYER_ID)
    const correct = playerHolds
      ? sameTeam(holders, [PLAYER_ID, ...lineup]) && TITLES_BY_ID.get(titleId)?.promotion === contract?.promotion
      : !lineup.some(id => holders.includes(id))
    if (!correct) {
      throw new Error('O reinado por equipes não corresponde à formação atual.')
    }
  }
  if (bout) {
    const show = shows.find(item => item.id === bout.showId)
    const teamBout = isTagBout(bout) ? bout : null
    const firstTeam = cornerFighterIds(bout, 'player', PLAYER_ID)
    const secondTeam = cornerFighterIds(bout, 'rival', bout.rivalId)
    const members = [...firstTeam, ...secondTeam]
    const result = show?.matches.find(item => item.id === bout.id)
    const resultTeams = result && matchTeams(result)
    const finish = bout.finish
    const winningStarter = finish?.winner === 'player' ? PLAYER_ID : bout.rivalId
    const invalidCorner = teamBout && (['player', 'rival'] as const).some(actor => {
      const corner = teamBout.tag[actor]
      return corner.legalIndex > corner.partners.length || (corner.lastTagTurn ?? 0) > bout.turn
        || (corner.legalIndex > 0 && corner.lastTagTurn === null) || (corner.saveUsed && bout.turn === 0)
        || benchSlots(teamBout, actor).some(slot => cornerSide(teamBout, actor, slot).position !== 'standing')
    })
    const plannedTag = teamBout ? tagTarget(teamBout, 'rival', bout.plan) : undefined
    const tagPlan = teamBout && !invalidCorner && plannedTag !== undefined && (finish || !tagSwapUnavailable(teamBout, 'rival', plannedTag))
    if (
      !show || firstTeam.length !== secondTeam.length || !validLineup(career, showPromotions(show), members, true) || bout.id !== show.id + '/career'
      || (!tagPlan && !validAction(bout.plan)) || bout.used.length !== bout.turn
      || bout.used.some(action => !validAction(action) && !(teamBout && (
        (action !== 'tag' && Object.hasOwn(TAG_ACTIONS, action)) || tagTarget(teamBout, 'player', action) !== undefined
      )))
      || bout.log.some(item => item.turn > bout.turn)
      || invalidCorner
      || (finish && (!result || !resultTeams || result.secondId !== bout.rivalId || !sameTeam(resultTeams[0], firstTeam)
        || !sameTeam(resultTeams[1], secondTeam) || result.winnerId !== legalFighterId(bout, finish.winner, winningStarter)
        || result.titleId !== bout.titleId || result.method !== finish.method || result.rounds !== bout.turn || bout.xpAwarded === 0))
      || (!finish && (show.date !== career.date || contract?.status !== 'active' || !showPromotions(show).includes(contract.promotion)
        || (teamBout && !sameTeam(firstTeam.slice(1), careerTeamPartners(career, firstTeam.length === 3 ? 'trios' : 'tag')))
        || result || bout.xpAwarded !== 0
        || members.some(id => bookedByDate.get(show.date)?.has(id))))
    ) throw new Error('O estado da luta não corresponde ao calendário.')
    if (!finish && bout.titleId) {
      const title = TITLES_BY_ID.get(bout.titleId)
      const belt = belts.get(bout.titleId)
      const holders = belt?.holders
      if (!title || !belt || title.promotion !== contract?.promotion || !showSupportsTitle(show, title)
        || firstTeam.length !== defenseSize(title) || !members.every(id => titleEligible(career, title, id))
        || (holders && !sameTeam(holders, firstTeam) && !sameTeam(holders, secondTeam))) {
        throw new Error('A disputa de cinturão em andamento é inválida.')
      }
    }
  }
  return career
}

const envelopeSchema = z.object({
  format: z.literal('wrestling-legacy'),
  version: z.literal([1, 2, 3, SAVE_VERSION]),
  career: z.looseObject({ schemaVersion: z.literal([1, 2, 3, SAVE_VERSION]) }),
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
