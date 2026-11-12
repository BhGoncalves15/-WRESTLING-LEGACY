import type { PromotionId } from '../domain/model'
import { SOURCES } from './sources'

type HistoricalObservation = {
  id: string
  name: string
  promotion: PromotionId
  date: string
  detail: string
  source: string
}

// Observações do mundo real depois da abertura. O motor carrega apenas o recorte de janeiro.
export const HISTORICAL_OBSERVATIONS: readonly HistoricalObservation[] = [
  { id: 'aaron-wolf', name: 'Aaron Wolf', promotion: 'njpw', date: '2026-01-04', detail: 'Primeira luta profissional no Wrestle Kingdom 20.', source: SOURCES.njpwWk20 },
  { id: 'chris-brookes', name: 'Chris Brookes', promotion: 'njpw', date: '2026-01-04', detail: 'Estreia oficial na NJPW contra El Phantasmo.', source: 'https://www.njpw1972.com/618058' },
  { id: 'oba-femi', name: 'Oba Femi', promotion: 'nxt', date: '2026-01-06', detail: 'Defendeu o NXT Championship e deixou o cinturão no ringue.', source: SOURCES.nxtEvil },
  { id: 'izzi-dame', name: 'Izzi Dame', promotion: 'nxt', date: '2026-01-06', detail: 'Conquistou o NXT Women’s North American Championship.', source: SOURCES.nxtEvil },
  { id: 'drew-mcintyre', name: 'Drew McIntyre', promotion: 'smackdown', date: '2026-01-09', detail: 'Conquistou o Undisputed WWE Championship.', source: 'https://www.wwe.com/shows/smackdown/2026-01-09/results' },
  { id: 'roman-reigns', name: 'Roman Reigns', promotion: 'raw', date: '2026-01-31', detail: 'Venceu o Royal Rumble masculino.', source: 'https://www.wwe.com/shows/royalrumble/royal-rumble-2026' },
  { id: 'leony-bwf', name: 'Leony', promotion: 'bwf', date: '2026-02-28', detail: 'Participação registrada no BWF In House 31.', source: SOURCES.bwfFeb },
  { id: 'robb-bwf', name: 'Robb', promotion: 'bwf', date: '2026-02-28', detail: 'Participação registrada no BWF In House 31.', source: SOURCES.bwfFeb },
  { id: 'm-elegance', name: 'M by Elegance', promotion: 'tna', date: '2026-08-27', detail: 'Primeira campeã do TNA Knockouts Television Championship.', source: SOURCES.tnaTv },
  { id: 'kofi-kingston', name: 'Kofi', promotion: 'aew', date: '2026-08-30', detail: 'Estreou na AEW no All In: London.', source: SOURCES.aewAllIn },
  { id: 'xavier-woods', name: 'Austin Creed', promotion: 'aew', date: '2026-08-30', detail: 'Estreou na AEW no All In: London.', source: SOURCES.aewAllIn },
  { id: 'ilja-dragunov', name: 'Ilja Dragunov', promotion: 'aew', date: '2026-10-17', detail: 'Estreou na AEW no WrestleDream.', source: SOURCES.aewWrestleDream },
  { id: 'ar-fox', name: 'AR Fox', promotion: 'roh', date: '2026-11-05', detail: 'Enfrentou Lee Moriarty no ROH on HonorClub.', source: 'https://prowrestling.net/site/2026/11/06/roh-on-honorclub-results-11-5-eddie-kingston-and-ortiz-vs-trent-beretta-and-rocky-romero-roh-pure-champion-lee-moriarty-vs-ar-fox-in-a-proving-ground-match/' },
  { id: 'leon-slater', name: 'Leon Slater', promotion: 'tna', date: '2026-11-05', detail: 'Apareceu como campeão mundial da TNA em novembro.', source: SOURCES.tnaNov },
]
