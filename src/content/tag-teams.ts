import type { PromotionId, WrestlingTeam } from '../domain/model'
import { SOURCES } from './sources'
import { OPENING_TITLES } from './titles'

type TeamReference = {
  promotion: PromotionId
  members: WrestlingTeam
  label: string
  source: string
}

export const TEAM_REFERENCES: readonly TeamReference[] = [
  ...OPENING_TITLES.flatMap(title => title.holderTeam && title.holder ? [{
    promotion: title.promotion, members: title.holderTeam, label: title.holder, source: title.source,
  }] : []),
  { promotion: 'raw', members: ['aj-styles', 'dragon-lee'], label: 'AJ Styles e Dragon Lee', source: SOURCES.raw29 },
  { promotion: 'raw', members: ['rhea-ripley', 'iyo-sky'], label: 'Rhea Ripley e IYO SKY', source: SOURCES.raw15 },
  { promotion: 'smackdown', members: ['jc-mateo', 'tonga-loa'], label: 'MFTs · JC Mateo e Tonga Loa', source: SOURCES.sd19 },
  { promotion: 'nxt', members: ['hank-walker', 'tank-ledger'], label: 'Hank & Tank · Hank Walker e Tank Ledger', source: SOURCES.nxtDec16 },
  { promotion: 'nxt', members: ['bronco-nima', 'lucien-price'], label: 'OTM · Bronco Nima e Lucien Price', source: SOURCES.nxtDec16 },
  { promotion: 'aew', members: ['toni-storm', 'mina-shirakawa'], label: 'Timeless Love Bombs · Toni Storm e Mina Shirakawa', source: SOURCES.aewWinter },
  { promotion: 'aew', members: ['jon-moxley', 'claudio-castagnoli', 'wheeler-yuta'], label: 'Death Riders · Jon Moxley, Claudio Castagnoli e Wheeler Yuta', source: SOURCES.aewTrios },
  { promotion: 'njpw', members: ['zack-sabre-jr', 'ryohei-oiwa'], label: 'TMDK · Zack Sabre Jr. e Ryohei Oiwa', source: SOURCES.njpwTagLeague },
  { promotion: 'njpw', members: ['gabe-kidd', 'yota-tsuji'], label: 'Gabe Kidd e Yota Tsuji', source: SOURCES.njpwTagLeague },
  { promotion: 'njpw', members: ['evil', 'ren-narita', 'sanada'], label: 'House of Torture · EVIL, Ren Narita e SANADA', source: SOURCES.njpwSix },
  { promotion: 'tna', members: ['tessa-blanchard', 'victoria-crawford'], label: 'Tessa Blanchard e Victoria Crawford', source: SOURCES.tnaFinal },
  { promotion: 'roh', members: ['tommy-billington', 'adam-priest'], label: 'Tommy Billington e Adam Priest', source: SOURCES.rohDecember },
  { promotion: 'roh', members: ['scorpio-sky', 'dante-martin', 'darius-martin'], label: 'SkyFlight · Scorpio Sky, Dante Martin e Darius Martin', source: SOURCES.rohDecember },
]
