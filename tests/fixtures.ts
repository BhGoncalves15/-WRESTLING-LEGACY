import { upcomingShows } from '../src/content/catalog'
import { type Division, type PromotionId } from '../src/domain/model'
import { advanceCareer, exampleProfile, newCareer, signOffer } from '../src/engine/career'

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
