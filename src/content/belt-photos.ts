import { START_DATE } from '../domain/model'
import type { TitleRecord } from './titles'

const licenses = {
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const

export type BeltPhoto = {
  id: string
  from: string
  until?: string
  author: string
  source: string
  license: keyof typeof licenses
  licenseUrl: string
  note: string
}

function photo(id: string, from: string, file: string, author: string, license: BeltPhoto['license'],
  until: string | undefined, note: string): BeltPhoto {
  return { id, from, until, author, source: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replaceAll(' ', '_')),
    license, licenseUrl: licenses[license], note }
}

// Only isolated photographs with a traceable reuse license enter the local catalog.
const photos: Partial<Record<string, readonly BeltPhoto[]>> = {
  'sd-world': [photo('sd-world-2014', '2014-08-18', 'WWE Championship (2014) commemorative belt.jpg', 'DraftSaturn15', 'CC BY 4.0',
    '2023-06-02', 'Réplica comemorativa da edição de 2014. Recorte, fundo branco e redução.')],
  'aaa-mixed': [photo('aaa-mixed-2003', '2003-06-15', 'AAA World Mixed Tag Team Championship belt.jpg', 'Tabercil', 'CC BY-SA 3.0',
    '2025-04-19', 'Versão de tira vermelha, fotografada em 2012. Recorte, fundo branco e redução.')],
}

const wweTitleHistory = 'https://www.wwe.com/titlehistory/'
const references: Partial<Record<string, string>> = {
  'raw-world': 'https://shop.wwe.com/en/wwe-world-heavyweight-championship-replica-title-belt/p-200116274',
  'raw-women': wweTitleHistory + 'womens-world-championship',
  'raw-ic': wweTitleHistory + 'intercontinental-championship',
  'raw-women-ic': wweTitleHistory + 'womens-intercontinental-championship',
  'raw-tag': wweTitleHistory + 'world-tag-team-championship',
  'sd-world': 'https://shop.wwe.com/en/undisputed-wwe-championship-replica-title-belt/p-356688230196121973',
  'sd-women': wweTitleHistory + 'wwe-womens-championship',
  'sd-us': 'https://shop.wwe.com/en/collectibles-and-toys/wwe-united-states-championship-replica-title-belt/d-5617346834%2Bf-8242196793%2Bz-7-3614840859?sku=17800200',
  'sd-women-us': wweTitleHistory + 'womens-united-states-championship',
  'sd-tag': wweTitleHistory + 'wwe-tag-team-championship',
  'wwe-women-tag': 'https://shop.wwe.com/en/wwe-womens-tag-team-replica-championship-title-belt/p-15198612957321',
  'nxt-men': wweTitleHistory + 'nxt-championship',
  'nxt-women': wweTitleHistory + 'nxt-womens-championship',
  'nxt-na': wweTitleHistory + 'nxt-north-american-championship',
  'nxt-women-na': wweTitleHistory + 'nxt-womens-north-american-championship',
  'nxt-tag': wweTitleHistory + 'nxt-tag-team-championship',
  'aew-world': 'https://shopaew.com/en-int/products/2024-aew-world-championship-replica',
  'aew-tnt': 'https://shopaew.com/en-int/products/aew-tnt-championship-black-replica-title-belt-rts',
  'aew-women': 'https://shopaew.com/en-us/products/aew-women-s-world-championship-replica-belt',
  'njpw-iwgp': 'https://www.njpw.co.jp/470271',
  'tna-world': 'https://tnawrestling.com/news/now-available-officially-licensed-authentic-replica-tna-world-championship-belts',
  'aaa-mixed': 'https://shop.wwe.com/en/aaa-world-mixed-tag-team-championship-replica-title-belt/p-247747206818005147',
  'bwf-south-america': 'https://bwf.com.br/sul-americano/',
}

export function beltReference(title: TitleRecord) {
  return references[title.id] ?? title.source
}

export function realBeltDesigns(title: TitleRecord): readonly BeltPhoto[] {
  return photos[title.id] ?? []
}

export function beltPhotoOn(title: TitleRecord, date = START_DATE) {
  return [...realBeltDesigns(title)].reverse().find(photo => photo.from <= date && (!photo.until || date < photo.until))
}
