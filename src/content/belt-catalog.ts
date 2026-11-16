import { START_DATE, type Career, type TitleChange } from '../domain/model'
import { titleName, unifiedTitleName } from './belt-designs'
import { beltPhotoOn, beltReference, type BeltPhoto } from './belt-photos'
import { ORGANIZATIONS } from './organizations'
import { ROSTER_BY_ID } from './roster'
import { TITLES_BY_ID, type TitleRecord } from './titles'

export const STUDIO_BRANDS = ['wwe', 'nxt', 'aew', 'tna', 'njpw', 'aaa', 'roh', 'bwf'] as const

export type BeltEdition = { photo: BeltPhoto | undefined } | { change: TitleChange }
export type BeltVisualRecord =
  | { kind: 'photo'; name: string; asset: string; photo: BeltPhoto }
  | { kind: 'studio'; name: string; asset: string; brand: typeof STUDIO_BRANDS[number]; inscription: string }
  | { kind: 'pending'; name: string; reference: string }

type VisualOptions = {
  date?: string
  unificationMatch?: string
  edition?: BeltEdition
  preview?: TitleRecord
}

function studio(title: TitleRecord, name: string, inscription: string, unified: boolean): BeltVisualRecord {
  const brand = title.promotion === 'nxt' ? 'nxt' : ORGANIZATIONS[title.promotion].company
  return { kind: 'studio', name, brand, inscription, asset: 'belts/studio/' + brand + (unified ? '-unified.webp' : '-standard.webp') }
}

function shortName(name: string) {
  return name.replace(/^(WWE |NXT |AEW |NJPW |TNA |AAA |ROH |BWF · |BWF |Campeonato )/, '')
    .replace(/( Championship| da BWF| \(Unificado\))+$/, '')
}

export function beltVisualFor(title: TitleRecord, career: Career | null, options: VisualOptions = {}): BeltVisualRecord {
  const { date, unificationMatch, edition, preview } = options
  if (preview) {
    return studio(title, unifiedTitleName(title, preview), shortName(title.name) + ' / ' + shortName(preview.name), true)
  }
  const change = edition ? ('change' in edition ? edition.change : undefined)
    : career?.titleChanges.filter(change => change.titleId === title.id && (!date || change.date < date
      || (change.kind === 'unification' && change.matchId !== undefined && change.matchId === unificationMatch))).at(-1)
  if (change) {
    const unification = change.kind === 'unification' ? change : career?.titleChanges.find(
      (entry): entry is Extract<TitleChange, { kind: 'unification' }> =>
        entry.kind === 'unification' && entry.titleId === title.id && entry.date <= change.date)
    const secondary = unification && TITLES_BY_ID.get(unification.secondaryId)
    const name = unification ? unification.name ?? unifiedTitleName(title, secondary) : title.name
    const honoree = change.kind === 'personalized' && change.champion.map(id =>
      id === 'career-player' ? career?.profile.name : ROSTER_BY_ID.get(id)?.name).filter(Boolean).join(' & ')
    const complementary = honoree || (secondary && shortName(secondary.name))
    const inscription = shortName(title.name) + (complementary ? ' / ' + complementary : '')
    return studio(title, name, inscription, Boolean(unification))
  }
  if (title.origin === 'fictional') return studio(title, title.name, shortName(title.name), false)
  const photo = edition && 'photo' in edition ? edition.photo : beltPhotoOn(title, date ?? career?.date ?? START_DATE)
  return photo ? { kind: 'photo', name: title.name, asset: 'belts/' + photo.id + '.webp', photo }
    : { kind: 'pending', name: date && !edition ? titleName(career, title, date) : title.name, reference: beltReference(title) }
}
