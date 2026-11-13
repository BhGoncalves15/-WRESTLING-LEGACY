import { placeSchema, type Place } from '../domain/geography'

export type Country = readonly [code: string, name: string, englishName: string, shard: number]
type City = readonly [id: number, name: string]
export type Region = readonly [id: number, name: string, type: string, cities: readonly City[]]
export type CountryPlaces = readonly [regions: readonly Region[], cities: readonly City[]]

const geographyBase = import.meta.env.BASE_URL + 'geography/'
export const flagsUrl = geographyBase + 'flags.webp'
const shards = new Map<number, Promise<Record<string, CountryPlaces>>>()
let index: Promise<Country[]> | undefined

async function fetchData(file: string) {
  const response = await fetch(geographyBase + file)
  if (!response.ok) throw new Error('Falha ao carregar o catálogo geográfico.')
  return response
}

export function countries(): Promise<Country[]> {
  index ??= fetchData('countries.json').then(response => response.json()).catch(error => {
    index = undefined
    throw error
  })
  return index
}

export async function placesFor(country: Country): Promise<CountryPlaces> {
  const [code, , , shard] = country
  let data = shards.get(shard)
  if (!data) {
    data = fetchData('places-' + shard + '.json.gz').then(response => {
      const stream = response.body
      if (!stream) throw new Error('Catálogo vazio.')
      return new Response(stream.pipeThrough(new DecompressionStream('gzip'))).json()
    }).catch(error => {
      shards.delete(shard)
      throw error
    })
    shards.set(shard, data)
  }
  return (await data)[code]
}

export const regionId = (code: string, region: Region) => code + ':' + region[0]
export const cityId = (code: string, region: Region | undefined, city: City) => (region ? regionId(code, region) : code + ':none') + ':' + city[0]

export function makePlace(code: string, catalog: CountryPlaces, selectedRegion: string, selectedCity: string, manualCity: string): Place {
  const [regions, withoutRegion] = catalog
  const region = regions.find(row => regionId(code, row) === selectedRegion)
  const available = region?.[3] ?? withoutRegion
  const city = available.find(row => cityId(code, region, row) === selectedCity)
  if ((selectedRegion && !region) || (selectedCity && !city) || (regions.length > 0 && !region && !city)) {
    throw new Error('Escolha uma divisão e uma cidade que pertençam ao país selecionado.')
  }
  return placeSchema.parse({
    countryCode: code, regionId: region ? regionId(code, region) : null, region: region?.[1] ?? null,
    cityId: city ? cityId(code, region, city) : null, city: city?.[1] ?? manualCity,
  })
}

const regionTypes: Readonly<Record<string, string>> = {
  state: 'Estado', province: 'Província', prefecture: 'Prefeitura', region: 'Região',
  territory: 'Território', department: 'Departamento', district: 'Distrito',
  canton: 'Cantão', governorate: 'Governadoria', municipality: 'Município', emirate: 'Emirado',
}
export function regionLabel(country: string, regions: readonly Region[]) {
  if (country === 'BR') return 'Estado ou Distrito Federal'
  if (country === 'US') return 'Estado ou território'
  if (country === 'CA') return 'Província ou território'
  const type = regions[0]?.[2]
  return type && regions.every(region => region[2] === type) ? regionTypes[type] ?? 'Divisão administrativa' : 'Divisão administrativa'
}
