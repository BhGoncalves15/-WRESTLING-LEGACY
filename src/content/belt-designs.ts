import { ORGANIZATIONS } from './organizations'
import type { TitleRecord } from './titles'
import type { BeltArtwork } from '../domain/belt-art'
import type { Career, CompanyId, TitleChange } from '../domain/model'
import { Random } from '../engine/random'

export type BeltArtBrief = {
  title: string
  promotion: string
  company?: CompanyId
  accent: string
  prestige: number
  lineage: string[]
  reason: TitleChange['kind'] | 'reference'
  formerDesign?: BeltArtwork
  seed: string
}

const flagshipTitles = new Set(['raw-world', 'raw-women', 'sd-world', 'sd-women', 'nxt-men', 'nxt-women', 'aew-world', 'aew-women',
  'njpw-iwgp', 'njpw-iwgp-women', 'tna-world', 'tna-knockouts', 'aaa-mega', 'aaa-reina', 'roh-world', 'roh-women', 'bwf-brazil'])

export function titlePrestige(title: TitleRecord, defenses: number, unified = false) {
  const weight = flagshipTitles.has(title.id) ? 12 : title.rule === 'tag' || title.rule === 'trios' ? -8 : -14
  return Math.min(100, ORGANIZATIONS[title.promotion].prestige + weight + Math.min(defenses * 2, 10) + (unified ? 6 : 0))
}

export function unifiedTitleName(title: TitleRecord, secondary?: TitleRecord) {
  const simple = title.name + ' (Unificado)'
  if (!secondary) return simple
  const company = ORGANIZATIONS[title.promotion].company.toUpperCase()
  const stem = (name: string) => name.replace(/ Championship$/, '')
  if (company === 'BWF') {
    const short = (name: string) => name.replace(/^(BWF |Campeonato )/, '').replace(/ da BWF$/, '')
    return 'BWF · ' + short(title.name) + ' e ' + short(secondary.name) + ' (Unificado)'
  }
  const other = stem(secondary.name).replace(new RegExp('^' + company + ' '), '')
  const paired = stem(title.name) + ' & ' + other + ' Championship (Unificado)'
  return paired.length <= 100 ? paired : simple
}

export function titleName(career: Career | null, title: TitleRecord, matchDate?: string) {
  const change = career?.titleChanges.find(entry => entry.kind === 'unification' && entry.titleId === title.id
    && (!matchDate || entry.date < matchDate))
  return change?.kind === 'unification' ? change.name ?? unifiedTitleName(title) : title.name
}

type Theme = {
  plates: readonly BeltArtwork['plate'][]
  straps: readonly BeltArtwork['strap'][]
  motifs: readonly BeltArtwork['motif'][]
  lettering: BeltArtwork['lettering']
}

const themes: Record<CompanyId, Theme> = {
  wwe: { plates: ['shield', 'octagon', 'plaque'], straps: ['ink', 'ivory', 'indigo'], motifs: ['diamond', 'crown'], lettering: 'block' },
  aew: { plates: ['baroque', 'octagon', 'oval'], straps: ['ink', 'oxblood'], motifs: ['sun', 'wings'], lettering: 'block' },
  njpw: { plates: ['crest', 'baroque', 'oval'], straps: ['ink', 'ivory', 'oxblood'], motifs: ['sun', 'crown'], lettering: 'serif' },
  tna: { plates: ['plaque', 'shield', 'crest'], straps: ['ink', 'oxblood', 'ivory'], motifs: ['diamond', 'wings'], lettering: 'block' },
  aaa: { plates: ['sunstone', 'crest', 'oval'], straps: ['oxblood', 'ink', 'forest'], motifs: ['sun', 'diamond'], lettering: 'serif' },
  roh: { plates: ['octagon', 'plaque', 'oval'], straps: ['ink', 'oxblood'], motifs: ['wings', 'crown'], lettering: 'serif' },
  bwf: { plates: ['oval', 'shield', 'plaque'], straps: ['forest', 'ink', 'indigo'], motifs: ['diamond', 'sun'], lettering: 'block' },
}

export function beltArtworkFor(brief: BeltArtBrief): BeltArtwork {
  const prompt = [brief.seed, brief.title, brief.promotion, brief.prestige, brief.reason, ...brief.lineage].join('|')
  const seed = Array.from(prompt).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261)
  const random = new Random(seed)
  const former = brief.formerDesign
  const theme = brief.company ? themes[brief.company] : undefined
  const plates = theme?.plates ?? ['shield', 'oval', 'octagon', 'crest']
  const straps = theme?.straps ?? ['ink', 'oxblood', 'indigo', 'ivory', 'forest']
  const plate = random.pick(plates.filter(value => value !== former?.plate))
  const strap = random.pick(straps.filter(value => value !== former?.strap))
  return {
    plate, strap, metal: random.pick(brief.prestige >= 70 || brief.reason === 'unification' ? ['gold', 'gold', 'silver'] : ['bronze', 'silver', 'gold']),
    motif: brief.reason === 'unification' ? 'interlocked' : random.pick(theme?.motifs ?? ['wings', 'sun', 'crown', 'diamond']),
    accent: brief.accent, sidePlates: brief.prestige >= 64 || brief.reason === 'unification' ? 4 : 2,
    lettering: theme?.lettering ?? random.pick(['serif', 'block']), company: brief.company,
  }
}

export function referenceBeltArtwork(title: TitleRecord) {
  const org = ORGANIZATIONS[title.promotion]
  const artwork = beltArtworkFor({
    title: title.name, promotion: org.name, company: org.company, accent: org.accent,
    prestige: titlePrestige(title, 0), lineage: [], reason: 'reference', seed: title.id,
  })
  if (title.id === 'aaa-mixed') return { ...artwork, strap: 'oxblood' as const, plate: 'sunstone' as const, metal: 'gold' as const }
  return artwork
}
