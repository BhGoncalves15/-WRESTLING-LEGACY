import { ORGANIZATIONS } from './organizations'
import type { TitleRecord } from './titles'
import type { BeltArtwork } from '../domain/belt-art'
import type { Career, TitleChange } from '../domain/model'
import { Random } from '../engine/random'

export type BeltArtBrief = {
  title: string
  promotion: string
  accent: string
  prestige: number
  lineage: string[]
  reason: TitleChange['kind']
  formerDesign?: BeltArtwork
  seed: string
}

const flagshipTitles = new Set(['raw-world', 'raw-women', 'sd-world', 'sd-women', 'nxt-men', 'nxt-women', 'aew-world', 'aew-women',
  'njpw-iwgp', 'njpw-iwgp-women', 'tna-world', 'tna-knockouts', 'aaa-mega', 'aaa-reina', 'roh-world', 'roh-women', 'bwf-brazil'])

export function titlePrestige(title: TitleRecord, defenses: number, unified = false) {
  const weight = flagshipTitles.has(title.id) ? 12 : title.rule === 'tag' || title.rule === 'trios' ? -8 : -14
  return Math.min(100, ORGANIZATIONS[title.promotion].prestige + weight + Math.min(defenses * 2, 10) + (unified ? 6 : 0))
}

export function unifiedTitleName(title: TitleRecord) {
  return title.name + ' (Unificado)'
}

export function titleName(career: Career | null, title: TitleRecord, matchDate?: string) {
  return career?.titleChanges.some(change => change.kind === 'unification' && change.titleId === title.id
    && (!matchDate || change.date < matchDate)) ? unifiedTitleName(title) : title.name
}

export function beltArtworkFor(brief: BeltArtBrief): BeltArtwork {
  const prompt = [brief.seed, brief.title, brief.promotion, brief.prestige, brief.reason, ...brief.lineage].join('|')
  const seed = Array.from(prompt).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261)
  const random = new Random(seed)
  const former = brief.formerDesign
  const plate = random.pick((['shield', 'oval', 'octagon', 'crest'] as const).filter(value => value !== former?.plate))
  const strap = random.pick((['ink', 'oxblood', 'indigo', 'ivory', 'forest'] as const).filter(value => value !== former?.strap))
  return {
    plate, strap, metal: random.pick(brief.prestige >= 70 ? ['gold', 'gold', 'silver'] : ['bronze', 'silver', 'gold']),
    motif: brief.reason === 'unification' ? 'interlocked' : random.pick(['wings', 'sun', 'crown', 'diamond']),
    accent: brief.accent, sidePlates: brief.prestige >= 64 || brief.reason === 'unification' ? 4 : 2,
    lettering: random.pick(['serif', 'block']),
  }
}
