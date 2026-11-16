import { ORGANIZATIONS } from '../content/organizations'
import { titlePrestige } from '../content/belt-designs'
import { TITLES_BY_ID } from '../content/titles'
import type { Career, TitlePair } from '../domain/model'
import { CAREER_FIGHTER_ID, canUnify, compatibleTitles, type BeltStates } from './titles'

export const UNIFICATION_REVIEW_DAYS = 3

export function unificationStats(states: BeltStates, pair: TitlePair) {
  const primary = TITLES_BY_ID.get(pair.titleId)!
  const secondary = TITLES_BY_ID.get(pair.secondaryId)!
  const first = states.get(primary.id)!.defenses
  const second = states.get(secondary.id)!.defenses
  return { defenses: first + second, gap: Math.abs(titlePrestige(primary, first) - titlePrestige(secondary, second)) }
}

export function titleProposalIssue(career: Career, states: BeltStates, pair: TitlePair, date: string) {
  const primary = TITLES_BY_ID.get(pair.titleId)
  const secondary = TITLES_BY_ID.get(pair.secondaryId)
  if (!primary || !secondary) return 'Os títulos selecionados precisam existir no catálogo.'
  if (ORGANIZATIONS[primary.promotion].company !== ORGANIZATIONS[secondary.promotion].company) {
    return 'As duas empresas administram linhagens independentes. Um evento conjunto não transfere essa autoridade.'
  }
  if (!compatibleTitles(primary, secondary)) {
    return 'Os dois títulos precisam ter a mesma brand responsável, divisão, formato e regras de disputa.'
  }
  if (career.contract?.status !== 'active' || career.contract.promotion !== primary.promotion || date >= career.contract.end) {
    return 'O contrato com a brand responsável precisa estar ativo.'
  }
  if (![primary.id, secondary.id].every(id => states.get(id)?.holders?.includes(CAREER_FIGHTER_ID))) {
    return 'Você precisa deter os dois cinturões ao mesmo tempo.'
  }
  if (!canUnify(states, pair)) {
    return 'É preciso ter ao menos uma defesa de cada cinturão no mesmo reinado. Linhagens já unificadas ficam fora de novos pedidos.'
  }
  return null
}

export function immediateUnification(career: Career, states: BeltStates, pair: TitlePair) {
  const { defenses, gap } = unificationStats(states, pair)
  return career.popularity >= 65 && defenses >= 4 && gap <= 24
}

export function titleReviewIssue(career: Career, states: BeltStates, pair: TitlePair, date: string) {
  const issue = titleProposalIssue(career, states, pair, date)
  if (issue) return issue
  const { defenses, gap } = unificationStats(states, pair)
  if (gap > 32) return 'A diferença de prestígio é de ' + gap + ' pontos. O limite da diretoria é 32.'
  if (defenses < 4 && career.popularity < 35) return 'A diretoria exige quatro defesas somadas ou popularidade 35 para unir as divisões.'
  return null
}
