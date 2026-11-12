import type { CompanyId, PromotionId } from '../domain/model'
import { SOURCES } from './sources'

export type Promotion = {
  id: PromotionId
  company: CompanyId
  name: string
  initials: string
  home: string
  description: string
  accent: string
  basePay: number
  prestige: number
  source: string
}

export const COMPANY_NAMES: Record<CompanyId, string> = {
  wwe: 'WWE', aew: 'All Elite Wrestling', njpw: 'New Japan Pro-Wrestling', tna: 'TNA Wrestling',
  aaa: 'Lucha Libre AAA', roh: 'Ring of Honor', bwf: 'Brazilian Wrestling Federation',
}

export const ORGANIZATIONS: Record<PromotionId, Promotion> = {
  raw: { id: 'raw', company: 'wwe', name: 'WWE Raw', initials: 'RAW', home: 'Estados Unidos',
    description: 'Brand da WWE com shows semanais às segundas e participação nos eventos principais da empresa.',
    accent: '#f37e78', basePay: 1380, prestige: 93, source: SOURCES.raw29 },
  smackdown: { id: 'smackdown', company: 'wwe', name: 'WWE SmackDown', initials: 'SD', home: 'Estados Unidos',
    description: 'Brand da WWE com shows semanais às sextas e calendário próprio de rivalidades e cinturões.',
    accent: '#7caaff', basePay: 1300, prestige: 91, source: SOURCES.sd26 },
  nxt: { id: 'nxt', company: 'wwe', name: 'WWE NXT', initials: 'NXT', home: 'Estados Unidos',
    description: 'Brand de desenvolvimento da WWE com programação semanal e eventos especiais.',
    accent: '#e7d66a', basePay: 580, prestige: 61, source: SOURCES.nxtDecember },
  aew: { id: 'aew', company: 'aew', name: 'All Elite Wrestling', initials: 'AEW', home: 'Estados Unidos',
    description: 'Programação de Dynamite e Collision, com eventos como Revolution, Double or Nothing e All In.',
    accent: '#efd58b', basePay: 1160, prestige: 86, source: SOURCES.aewYearEnd },
  njpw: { id: 'njpw', company: 'njpw', name: 'New Japan Pro-Wrestling', initials: 'NJPW', home: 'Japão',
    description: 'Circuito de turnês, títulos IWGP, Wrestle Kingdom e programação internacional STRONG.',
    accent: '#f0a078', basePay: 850, prestige: 78, source: SOURCES.njpwDecember },
  tna: { id: 'tna', company: 'tna', name: 'TNA Wrestling', initials: 'TNA', home: 'Estados Unidos',
    description: 'Divisões X-Division e Knockouts, com o iMPACT! como programa semanal.',
    accent: '#f08072', basePay: 440, prestige: 56, source: SOURCES.tnaDallas },
  aaa: { id: 'aaa', company: 'aaa', name: 'Lucha Libre AAA', initials: 'AAA', home: 'México',
    description: 'Circuito mexicano de lucha libre com Triplemanía e participações de talentos de outras empresas.',
    accent: '#ecb286', basePay: 490, prestige: 55, source: SOURCES.aaaGuerra },
  roh: { id: 'roh', company: 'roh', name: 'Ring of Honor', initials: 'ROH', home: 'Estados Unidos',
    description: 'Circuito semanal do HonorClub e divisões com tradição em lutas técnicas.',
    accent: '#9bb9fc', basePay: 370, prestige: 52, source: SOURCES.rohWeekly },
  bwf: { id: 'bwf', company: 'bwf', name: 'Brazilian Wrestling Federation', initials: 'BWF', home: 'Brasil',
    description: 'Circuito brasileiro com programação de Telecatch, eventos In House e Maremoto.',
    accent: '#81d6a0', basePay: 260, prestige: 38, source: SOURCES.bwfRoster },
}
