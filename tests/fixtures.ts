import { upcomingShows } from '../src/content/catalog'
import type { CalendarVersion, Career, Division, Method, PromotionId } from '../src/domain/model'
import { advanceCareer, exampleProfile, hasLiveBout, newCareer, resolvePlayerTurn, signOffer } from '../src/engine/career'

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

export function careerWithOffer(promotion: PromotionId, division: Division = 'men', calendar: CalendarVersion = 'verified') {
  for (let index = 1; index <= 350; index++) {
    const career = newCareer({ ...exampleProfile(), division }, 'normal', { seed: (index * 0x9e3779b9) >>> 0 })
    if (career.offers.some(offer => offer.promotion === promotion)) return { ...career, calendar }
  }
  throw new Error('Nenhuma proposta para ' + promotion)
}

export function signedBefore(promotion: PromotionId, date: string, division: Division = 'men', calendar: CalendarVersion = 'verified') {
  let career = careerWithOffer(promotion, division, calendar)
  while (upcomingShows(career.worldThrough, 1, calendar)[0].date < date) career = advanceCareer(career)
  return signOffer(career, career.offers.find(offer => offer.promotion === promotion)!.id)
}

export const smackdownPair = { titleId: 'sd-us', secondaryId: 'sd-world' }

export function winSinglesFixture(career: Career) {
  const bout = duelBoutFor(career)
  return resolvePlayerTurn({
    ...career, bout: { ...bout, plan: 'guard', player: { ...bout.player, stamina: 100, position: 'standing' },
      rival: { ...bout.rival, condition: 0, position: 'grounded' } },
  }, 'pin')
}

export function smackdownDoubleChampion(calendar: CalendarVersion = 'verified') {
  let career = signedBefore('smackdown', '2026-01-01', 'men', calendar)
  while (career.date < '2026-03-13') {
    career = advanceCareer(career)
    if (hasLiveBout(career)) career = winSinglesFixture(career)
  }
  return career
}
