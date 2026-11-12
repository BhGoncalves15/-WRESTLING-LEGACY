import { z } from 'zod'
import { ORGANIZATIONS, ROSTER_BY_ID, TITLES_BY_ID, compareShows, fitsEventRoster, nextShows, showPromotions, validLegacyShow, wrestlerAppearsIn } from '../content/catalog'
import { validMoveset } from '../content/moves'
import { defenseFormat } from '../content/titles'
import { DATA_VERSION, LEGACY_DATA_VERSION, START_DATE, SAVE_VERSION, TAG_DATA_VERSION, TRIOS_DATA_VERSION, WORLD_DATA_VERSION, addDays, careerSchema, type Career, type Show } from '../domain/model'
import { PLAYER_ID } from '../engine/career'
import { validAction } from '../engine/combat'
import { formatForSize, matchTeams, sameTeam } from '../engine/matches'
import { TAG_ACTIONS, benchSlots, cornerFighterIds, cornerSide, isTagBout, legalFighterId, tagSwapUnavailable, tagTarget } from '../engine/tag-combat'
import { careerTeamPartners } from '../engine/tag-teams'
import { fighterDivision, showSupportsTitle, titleStates, titleTeamEligible } from '../engine/titles'

function unique(ids: string[]): boolean {
  return new Set(ids).size === ids.length
}

const legacySchema = z.looseObject({
  schemaVersion: z.literal(1), dataVersion: z.literal(LEGACY_DATA_VERSION), date: z.string(),
})
const worldSchema = z.looseObject({ schemaVersion: z.literal(2), dataVersion: z.literal(WORLD_DATA_VERSION) })
const trioSaveSchema = z.looseObject({ schemaVersion: z.literal(4), dataVersion: z.literal(TRIOS_DATA_VERSION) })
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
    ...save, schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, trioPartnerIds: null, mixedPartnerId: null,
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
  if (input.schemaVersion === 4) {
    const trios = trioSaveSchema.safeParse(input)
    return trios.success ? { ...trios.data, schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, mixedPartnerId: null } : input
  }
  if (input.schemaVersion === 3) {
    const tag = tagSaveSchema.safeParse(input)
    return tag.success ? migrateTagSave(tag.data) : input
  }
  const defaults = { schemaVersion: SAVE_VERSION, dataVersion: DATA_VERSION, tagPartnerId: null, trioPartnerIds: null, mixedPartnerId: null, preferredFormat: 'singles' }
  if (input.schemaVersion === 2) {
    const world = worldSchema.safeParse(input)
    return world.success ? { ...world.data, ...defaults } : input
  }
  if (input.schemaVersion !== 1) return input
  const legacy = legacySchema.safeParse(input)
  if (!legacy.success) return input
  return { ...legacy.data, ...defaults, expandedOn: legacy.data.date, vacatedTitles: [] }
}

function validLineup(career: Career, show: Show, teams: readonly [string[], string[]], player: boolean, mixed?: true): boolean {
  const [first, second] = teams
  const participants = [...first, ...second]
  if (first.length !== second.length || !unique(participants) || player !== (first[0] === PLAYER_ID)) return false
  const divisions = first.map(id => fighterDivision(career, id))
  if (mixed) {
    if (show.promotion !== 'aaa' || first.length !== 2 || divisions[0] === divisions[1]) return false
  } else if (divisions.some(division => division !== divisions[0])) return false
  if (second.some((id, index) => fighterDivision(career, id) !== divisions[index])) return false
  const circuits = showPromotions(show)
  return participants.every((id, index) => {
    if (player && index === 0) return true
    const fighter = ROSTER_BY_ID.get(id)
    return Boolean(fighter && fitsEventRoster(show, id) && circuits.some(promotion => wrestlerAppearsIn(fighter, promotion)))
  })
}

export function validateCareer(input: unknown): Career {
  const parsed = careerSchema.safeParse(migrate(input))
  if (!parsed.success) throw new Error('A estrutura da carreira é inválida ou usa uma versão incompatível.')
  const career = parsed.data
  const { profile, bout, contract, shows, ledger, history, expandedOn, vacatedTitles, trioPartnerIds, mixedPartnerId, preferredFormat } = career
  const partners = [...careerTeamPartners(career, 'tag'), ...careerTeamPartners(career, 'trios')]
  const mixedPartner = mixedPartnerId ? ROSTER_BY_ID.get(mixedPartnerId) : undefined
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
    || (mixedPartnerId && (contract?.promotion !== 'aaa' || !mixedPartner || mixedPartner.division === profile.division || !wrestlerAppearsIn(mixedPartner, 'aaa')))
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
      && show.special === expected.special && show.series === expected.series
      && (show.guestPromotions ?? []).join(',') === (expected.guestPromotions ?? []).join(',')
    const legacySchedule = expandedOn && show.date <= expandedOn && show.id === show.promotion + '@' + show.date && !show.series && validLegacyShow(show)
    if (
      show.date < START_DATE || show.date > career.worldThrough || (!matchesSchedule && !legacySchedule)
      || show.matches.length > 3 || (index > 0 && compareShows(shows[index - 1], show) >= 0)
    ) throw new Error('Há um evento inválido no calendário.')
    const participants = bookedByDate.get(show.date) ?? new Set<string>()
    bookedByDate.set(show.date, participants)
    for (const match of show.matches) {
      const [first, second] = matchTeams(match)
      const members = [...first, ...second]
      if (
        !validLineup(career, show, [first, second], match.player, match.tag?.mixed)
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
    if (!holders?.includes(PLAYER_ID) || holders.length < 2) continue
    const title = TITLES_BY_ID.get(titleId)!
    const format = defenseFormat(title)
    if (!format || format === 'singles' || title.promotion !== contract?.promotion
      || !sameTeam(holders, [PLAYER_ID, ...careerTeamPartners(career, format)])) {
      throw new Error('O reinado por equipes não corresponde à formação atual.')
    }
  }
  if (bout) {
    const show = shows.find(item => item.id === bout.showId)
    const teamBout = isTagBout(bout) ? bout : null
    const firstTeam = cornerFighterIds(bout, 'player', PLAYER_ID)
    const secondTeam = cornerFighterIds(bout, 'rival', bout.rivalId)
    const format = formatForSize(firstTeam.length, bout.tag?.mixed)
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
      !show || !validLineup(career, show, [firstTeam, secondTeam], true, bout.tag?.mixed) || bout.id !== show.id + '/career'
      || (bout.tag?.mixed && bout.tag.player.legalIndex !== bout.tag.rival.legalIndex)
      || (!tagPlan && !validAction(bout.plan)) || bout.used.length !== bout.turn
      || bout.used.some(action => !validAction(action) && !(teamBout && (
        (action !== 'tag' && Object.hasOwn(TAG_ACTIONS, action)) || tagTarget(teamBout, 'player', action) !== undefined
      )))
      || bout.log.some(item => item.turn > bout.turn)
      || invalidCorner
      || (finish && (!result || !resultTeams || result.secondId !== bout.rivalId || !sameTeam(resultTeams[0], firstTeam)
        || !sameTeam(resultTeams[1], secondTeam) || result.tag?.mixed !== bout.tag?.mixed
        || result.winnerId !== legalFighterId(bout, finish.winner, winningStarter)
        || result.titleId !== bout.titleId || result.method !== finish.method || result.rounds !== bout.turn || bout.xpAwarded === 0))
      || (!finish && (show.date !== career.date || contract?.status !== 'active' || !showPromotions(show).includes(contract.promotion)
        || (format !== 'singles' && !sameTeam(firstTeam.slice(1), careerTeamPartners(career, format)))
        || result || bout.xpAwarded !== 0
        || members.some(id => bookedByDate.get(show.date)?.has(id))))
    ) throw new Error('O estado da luta não corresponde ao calendário.')
    if (!finish && bout.titleId) {
      const title = TITLES_BY_ID.get(bout.titleId)
      const belt = belts.get(bout.titleId)
      const holders = belt?.holders
      if (!title || !belt || title.promotion !== contract?.promotion || !showSupportsTitle(show, title)
        || format !== defenseFormat(title) || !titleTeamEligible(career, title, firstTeam) || !titleTeamEligible(career, title, secondTeam)
        || (holders && !sameTeam(holders, firstTeam) && !sameTeam(holders, secondTeam))) {
        throw new Error('A disputa de cinturão em andamento é inválida.')
      }
    }
  }
  return career
}

const envelopeSchema = z.object({
  format: z.literal('wrestling-legacy'),
  version: z.literal([1, 2, 3, 4, SAVE_VERSION]),
  career: z.looseObject({ schemaVersion: z.literal([1, 2, 3, 4, SAVE_VERSION]) }),
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
