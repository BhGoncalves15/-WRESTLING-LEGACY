import { type Division, type PromotionId } from '../src/domain/model'
import { exampleProfile, newCareer } from '../src/engine/career'

export function careerWithOffer(promotion: PromotionId, division: Division = 'men') {
  for (let index = 1; index <= 350; index++) {
    const career = newCareer({ ...exampleProfile(), division }, 'normal', { seed: (index * 0x9e3779b9) >>> 0 })
    if (career.offers.some(offer => offer.promotion === promotion)) return career
  }
  throw new Error('Nenhuma proposta para ' + promotion)
}
