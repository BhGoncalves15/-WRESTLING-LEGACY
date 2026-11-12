import { upcomingShows } from '../src/content/catalog'
import type { Career, Division, Method, PromotionId } from '../src/domain/model'
import { advanceCareer, exampleProfile, newCareer, resolvePlayerTurn, signOffer } from '../src/engine/career'

export function duelBoutFor(career: Career) {
  if (!career.bout || career.bout.multi) throw new Error('Este teste precisa de uma luta com dois lados.')
  return career.bout
}

export function multiBoutFor(career: Career) {
  if (!career.bout?.multi) throw new Error('Este teste precisa de três ou quatro participantes individuais.')
  return career.bout
}

export function pauseForRivalFall(career: Career, method: Method = 'pinfall') {
  const bout = multiBoutFor(career)
  const [attacker, defender] = bout.multi.opponents
  const opponents = bout.multi.opponents.map(entry => entry.id === attacker.id
    ? { ...entry, action: method === 'pinfall' ? 'pin' : 'submit', targetId: defender.id }
    : { ...entry, action: 'guard', side: { ...entry.side, condition: 0, position: 'grounded' as const } })
  return resolvePlayerTurn({ ...career, bout: { ...bout, multi: { ...bout.multi, opponents } } }, 'guard')
}

export function careerWithOffer(promotion: PromotionId, division: Division = 'men') {
  for (let index = 1; index <= 350; index++) {
    const career = newCareer({ ...exampleProfile(), division }, 'normal', { seed: (index * 0x9e3779b9) >>> 0 })
    if (career.offers.some(offer => offer.promotion === promotion)) return career
  }
  throw new Error('Nenhuma proposta para ' + promotion)
}

export function signedBefore(promotion: PromotionId, date: string, division: Division = 'men') {
  let career = careerWithOffer(promotion, division)
  while (upcomingShows(career.worldThrough, 1)[0].date < date) career = advanceCareer(career)
  return signOffer(career, career.offers.find(offer => offer.promotion === promotion)!.id)
}
