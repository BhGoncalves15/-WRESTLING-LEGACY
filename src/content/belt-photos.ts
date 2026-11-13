import { START_DATE } from '../domain/model'
import type { TitleRecord } from './titles'

const licenses = {
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
} as const

export type BeltPhoto = {
  id: string
  from: string
  until?: string
  author: string
  source: string
  license: keyof typeof licenses
  licenseUrl: string
}

function photo(id: string, from: string, file: string, author: string, license: BeltPhoto['license'], until?: string): BeltPhoto {
  return { id, from, until, author, source: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replaceAll(' ', '_')),
    license, licenseUrl: licenses[license] }
}

const photos: Record<string, BeltPhoto[]> = {
  'raw-world': [photo('raw-world-2023', '2023-04-24', 'Damian Priest WHC - WWE Live Birmingham April 2024.jpg', 'Zippo9310', 'CC BY-SA 4.0')],
  'raw-women': [photo('raw-women-2023', '2023-06-12', 'Rhea Ripley 2024.jpg', 'Carter Sterling', 'CC BY-SA 2.0')],
  'nxt-men': [photo('nxt-men-2012', '2012-07-26', 'NXT Champion Finn Balor.jpg', 'Edge4life42', 'CC BY-SA 3.0', '2017-04-01')],
  'nxt-na': [photo('nxt-na-2018', '2018-04-03', 'Referee with NXT North American Championship.jpg', 'Miguel Discart', 'CC BY-SA 2.0')],
  'aew-world': [photo('aew-world-2019', '2019-08-31', 'Bryan Danielson as AEW World Champion.jpg', 'McPhail', 'CC0')],
  'aew-tbs': [photo('aew-tbs-2022', '2022-01-05', 'JC TBS Champion.jpg', 'Gtandersson', 'CC BY-SA 4.0')],
  'aew-tag': [photo('aew-tag-2019', '2019-10-30', 'FTR in August 2023 as AEW World Tag Team Champions.jpg', 'McPhail', 'CC0')],
  'aew-continental': [photo('aew-continental-2023', '2023-12-30', 'Kazuchika Okada as AEW Continental Champion in August 2024.jpg', 'McPhail', 'CC0')],
  'aew-international': [photo('aew-international-2023', '2023-03-15', 'Will Ospreay AEW International Champion.jpg', 'zuko1312', 'CC BY 2.0', '2025-07-12'),
    photo('aew-international-2025', '2025-07-12', 'Kazuchika Okada as AEW Unified Champion (cropped).jpg', 'KMcWrestling Photography', 'CC BY-SA 4.0', '2026-05-24')],
  'aew-women': [photo('aew-women-2022', '2022-03-06', 'Mariah May AEW Grand Slam.jpg', 'zuko1312', 'CC BY 2.0')],
  'aew-tnt': [photo('aew-tnt-2024', '2024-07-24', 'Jack Perry as AEW TNT Champion (cropped).jpg', 'McPhail', 'CC0', '2024-11-23'),
    photo('aew-tnt-2025', '2025-07-31', 'Kyle Fletcher, August 30 2025.jpg', 'KMcWrestling Photography', 'CC BY-SA 4.0')],
  'tna-world': [photo('tna-world-2018', '2018-04-22', 'Johnny Impact Feb 2019-2.jpg', 'Tabercil', 'CC BY-SA 3.0', '2021-08-19')],
  'tna-knockouts': [photo('tna-knockouts-2007', '2007-10-14', "TNA Women's Knockout Championship Belt.png", 'Pedrohoneto', 'CC BY-SA 3.0', '2014-12-25')],
  'aaa-mega': [photo('aaa-mega-2012', '2012-03-18', 'El Hijo del Vikingo, Jan 2023.jpg', 'Earl Gardner', 'CC BY-SA 2.0', '2026-03-14')],
  'roh-world': [photo('roh-world-2023', '2023-03-31', 'Bandido ROH.jpg', 'KMcWrestling Photography', 'CC BY-SA 4.0')],
  'njpw-iwgp': [photo('njpw-iwgp-2021', '2021-03-30', 'Zack Sabre Jr, IWGP Champion.jpg', 'Sceptre', 'CC BY 4.0', '2026-01-05')],
}

export function realBeltDesigns(title: TitleRecord): BeltPhoto[] {
  return photos[title.id] ?? []
}

export function openingBeltPhoto(title: TitleRecord) {
  return realBeltDesigns(title).find(photo => photo.from <= START_DATE && (!photo.until || START_DATE < photo.until))
}
