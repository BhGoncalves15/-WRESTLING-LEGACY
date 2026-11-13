import { z } from 'zod'

const name = z.string().trim().min(1).max(100)
export const placeSchema = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  regionId: z.string().regex(/^[A-Z]{2}:[0-9]+$/).nullable(),
  region: name.nullable(),
  cityId: z.string().regex(/^[A-Z]{2}:(?:[0-9]+|none):[0-9]+$/).nullable(),
  city: name,
}).refine(place => (
  (place.regionId === null) === (place.region === null)
  && (!place.regionId || place.regionId.startsWith(place.countryCode + ':'))
  && (!place.cityId || place.cityId.startsWith((place.regionId ?? place.countryCode + ':none') + ':'))
), { message: 'A cidade precisa corresponder ao país e à divisão administrativa selecionados.' })

export type Place = z.infer<typeof placeSchema>
export const searchKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim()
