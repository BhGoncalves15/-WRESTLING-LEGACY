import type { Division, PromotionId, TagTeam } from '../domain/model'
import { SOURCES } from './sources'

export type TitleRule = 'singles' | 'junior' | 'cruiser' | 'pure' | 'television' | 'rookies' | 'tag' | 'trios' | 'maremoto'

export type TitleRecord = {
  id: string
  name: string
  promotion: PromotionId
  listings: readonly PromotionId[]
  division: Division | 'mixed'
  rule: TitleRule
  status: 'active' | 'later' | 'unverified'
  holder: string | null
  holderId?: string
  holderTeam?: TagTeam
  vacant?: boolean
  source: string
  note?: string
}

type SinglesSettings = {
  rule?: TitleRule
  listings?: readonly PromotionId[]
  vacant?: boolean
  status?: TitleRecord['status']
  note?: string
}

function singles(id: string, name: string, promotion: PromotionId, division: Division,
  holderId: string | undefined, holder: string | null, source: string, settings: SinglesSettings = {}): TitleRecord {
  return {
    id, name, promotion, division, holderId, holder, source,
    status: settings.status ?? 'active', listings: settings.listings ?? [promotion], rule: settings.rule ?? 'singles',
    vacant: settings.vacant, note: settings.note,
  }
}

function team(id: string, name: string, promotion: PromotionId, division: TitleRecord['division'],
  rule: 'tag' | 'trios', holder: string, source: string, holderTeam?: TagTeam, listings: readonly PromotionId[] = [promotion]): TitleRecord {
  return { id, name, promotion, division, rule, holder, holderTeam, source, status: 'active', listings }
}

const WWE_BRANDS = ['raw', 'smackdown', 'nxt'] as const

export const OPENING_TITLES: readonly TitleRecord[] = [
  // WWE
  singles('raw-world', 'World Heavyweight Championship', 'raw', 'men', 'cm-punk', 'CM Punk', SOURCES.raw29),
  singles('raw-women', 'Women’s World Championship', 'raw', 'women', 'stephanie-vaquer', 'Stephanie Vaquer', SOURCES.raw29),
  singles('raw-ic', 'WWE Intercontinental Championship', 'raw', 'men', 'dominik-mysterio', 'Dominik Mysterio', SOURCES.wweIC),
  singles('raw-women-ic', 'WWE Women’s Intercontinental Championship', 'raw', 'women', 'maxxine-dupri', 'Maxxine Dupri', SOURCES.wweWomenIC),
  team('raw-tag', 'World Tag Team Championship', 'raw', 'men', 'tag', 'The Usos · Jey Uso e Jimmy Uso', SOURCES.raw29, ['jey-uso', 'jimmy-uso']),
  singles('sd-world', 'Undisputed WWE Championship', 'smackdown', 'men', 'cody-rhodes', 'Cody Rhodes', SOURCES.wweChampion),
  singles('sd-women', 'WWE Women’s Championship', 'smackdown', 'women', 'jade-cargill', 'Jade Cargill', SOURCES.nxtSnapshot),
  singles('sd-us', 'WWE United States Championship', 'smackdown', 'men', 'carmelo-hayes', 'Carmelo Hayes', SOURCES.sd26),
  singles('sd-women-us', 'WWE Women’s United States Championship', 'smackdown', 'women', 'chelsea-green', 'Chelsea Green', SOURCES.wweWomenUS),
  team('sd-tag', 'WWE Tag Team Championship', 'smackdown', 'men', 'tag', 'The Wyatt Sicks · Dexter Lumis e Joe Gacy', SOURCES.sd19, ['dexter-lumis', 'joe-gacy']),
  team('wwe-women-tag', 'WWE Women’s Tag Team Championship', 'raw', 'women', 'tag', 'The Kabuki Warriors · Asuka e Kairi Sane', SOURCES.wweWomenTag, ['asuka', 'kairi-sane'], WWE_BRANDS),
  singles('nxt-men', 'NXT Championship', 'nxt', 'men', 'oba-femi', 'Oba Femi', SOURCES.nxtTitle),
  singles('nxt-women', 'NXT Women’s Championship', 'nxt', 'women', 'jacy-jayne', 'Jacy Jayne', SOURCES.nxtWomen),
  singles('nxt-na', 'NXT North American Championship', 'nxt', 'men', 'ethan-page', 'Ethan Page', SOURCES.nxtDecember),
  singles('nxt-women-na', 'NXT Women’s North American Championship', 'nxt', 'women', 'thea-hail', 'Thea Hail', SOURCES.nxtWomenNA),
  team('nxt-tag', 'NXT Tag Team Championship', 'nxt', 'men', 'tag', 'DarkState · Dion Lennox e Osiris Griffin', SOURCES.nxtHalloween, ['dion-lennox', 'osiris-griffin']),
  // AEW
  singles('aew-world', 'AEW World Championship', 'aew', 'men', 'mjf', 'MJF', SOURCES.aewWorldsEnd),
  singles('aew-international', 'AEW International Championship', 'aew', 'men', 'kazuchika-okada', 'Kazuchika Okada', SOURCES.aewWorldsEnd),
  singles('aew-continental', 'AEW Continental Championship', 'aew', 'men', 'jon-moxley', 'Jon Moxley', SOURCES.aewYearEnd),
  singles('aew-national', 'AEW National Championship', 'aew', 'men', 'ricochet', 'Ricochet', SOURCES.aewYearEnd),
  singles('aew-tnt', 'AEW TNT Championship', 'aew', 'men', 'mark-briscoe', 'Mark Briscoe', SOURCES.aewYearEnd),
  team('aew-tag', 'AEW World Tag Team Championship', 'aew', 'men', 'tag', 'FTR · Cash Wheeler e Dax Harwood', SOURCES.aewWorldsEnd, ['cash-wheeler', 'dax-harwood']),
  team('aew-trios', 'AEW World Trios Championship', 'aew', 'men', 'trios', 'The Opps · Samoa Joe, Katsuyori Shibata e Powerhouse Hobbs', SOURCES.aewTrios),
  singles('aew-women', 'AEW Women’s World Championship', 'aew', 'women', 'kris-statlander', 'Kris Statlander', SOURCES.aewWorldsEnd),
  singles('aew-tbs', 'AEW TBS Championship', 'aew', 'women', 'willow-nightingale', 'Willow Nightingale', SOURCES.aewYearEnd),
  team('aew-women-tag', 'AEW Women’s World Tag Team Championship', 'aew', 'women', 'tag', 'Babes of Wrath · Willow Nightingale e Harley Cameron', SOURCES.aewWorldsEnd, ['willow-nightingale', 'harley-cameron']),
  // NJPW
  singles('njpw-iwgp', 'IWGP World Heavyweight Championship', 'njpw', 'men', 'konosuke-takeshita', 'Konosuke Takeshita', SOURCES.njpwWk20,
    { note: 'O IWGP Heavyweight Championship foi reativado no mundo real depois do Wrestle Kingdom 20.' }),
  singles('njpw-global', 'IWGP Global Heavyweight Championship', 'njpw', 'men', 'yota-tsuji', 'Yota Tsuji', SOURCES.njpwSnapshot),
  singles('njpw-junior', 'IWGP Junior Heavyweight Championship', 'njpw', 'men', 'douki', 'DOUKI', SOURCES.njpwSnapshot, { rule: 'junior' }),
  team('njpw-tag', 'IWGP Tag Team Championship', 'njpw', 'men', 'tag', 'Knockout Brothers · OSKAR e Yuto-Ice', SOURCES.njpwSnapshot, ['oskar', 'yuto-ice']),
  team('njpw-junior-tag', 'IWGP Junior Heavyweight Tag Team Championship', 'njpw', 'men', 'tag', 'House of Torture · DOUKI e SHO', SOURCES.njpwSnapshot),
  singles('njpw-iwgp-women', 'IWGP Women’s Championship', 'njpw', 'women', 'syuri', 'Syuri', SOURCES.njpwWomen),
  singles('njpw-never', 'NEVER Openweight Championship', 'njpw', 'men', 'evil', 'EVIL', SOURCES.njpwWk20),
  team('njpw-never-six', 'NEVER Openweight 6-Man Tag Team Championship', 'njpw', 'men', 'trios', 'Toru Yano, Master Wato e YOH', SOURCES.njpwTagLeague),
  singles('njpw-tv', 'NJPW World Television Championship', 'njpw', 'men', 'el-phantasmo', 'El Phantasmo', SOURCES.njpwTv, { rule: 'television' }),
  singles('njpw-strong', 'STRONG Openweight Championship', 'njpw', 'men', 'tomohiro-ishii', 'Tomohiro Ishii', SOURCES.njpwSnapshot),
  team('njpw-strong-tag', 'STRONG Openweight Tag Team Championship', 'njpw', 'men', 'tag', 'Los Hermanos Chávez · Ángel de Oro e Niebla Roja', SOURCES.njpwStrongTag, ['angel-de-oro', 'niebla-roja']),
  singles('njpw-strong-women', 'STRONG Women’s Championship', 'njpw', 'women', 'saya-kamitani', 'Saya Kamitani', SOURCES.njpwWomen),
  singles('njpw-tamashii', 'NJPW TAMASHII Openweight Championship', 'njpw', 'men', undefined, null, SOURCES.njpwTamashii,
    { status: 'later', note: 'Don Fale tornou-se campeão inaugural em 10/10/2026.' }),
  team('njpw-tamashii-tag', 'NJPW TAMASHII Tag Team Championship', 'njpw', 'men', 'tag', 'The Pretty Boys · Magic Mark e Pretty Richie', SOURCES.njpwSnapshot),
  // TNA
  singles('tna-world', 'TNA World Championship', 'tna', 'men', 'frankie-kazarian', 'Frankie Kazarian', SOURCES.tnaDallas),
  singles('tna-international', 'TNA International Championship', 'tna', 'men', 'stacks', 'Stacks', SOURCES.tnaFinal),
  singles('tna-x', 'TNA X Division Championship', 'tna', 'men', 'leon-slater', 'Leon Slater', SOURCES.tnaDallas),
  team('tna-tag', 'TNA World Tag Team Championship', 'tna', 'men', 'tag', 'The Hardys · Jeff Hardy e Matt Hardy', SOURCES.tnaDallas, ['jeff-hardy', 'matt-hardy']),
  singles('tna-knockouts', 'TNA Knockouts World Championship', 'tna', 'women', 'lei-ying-lee', 'Léi Yǐng Lee', SOURCES.tnaDallas),
  singles('tna-knockouts-tv', 'TNA Knockouts Television Championship', 'tna', 'women', undefined, null, SOURCES.tnaTv,
    { status: 'later', note: 'M by Elegance foi a primeira campeã em 27/08/2026.' }),
  team('tna-knockouts-tag', 'TNA Knockouts World Tag Team Championship', 'tna', 'women', 'tag', 'The IInspiration · Cassie Lee e Jessie McKay', SOURCES.tnaDallas, ['cassie-lee', 'jessie-mckay']),
  // AAA
  singles('aaa-mega', 'AAA Mega Championship', 'aaa', 'men', 'dominik-mysterio', 'Dominik Mysterio', SOURCES.aaaGuerra),
  singles('aaa-latin', 'AAA Latin American Championship', 'aaa', 'men', 'wagner-jr', 'El Hijo de Dr. Wagner Jr.', SOURCES.aaaSnapshot),
  singles('aaa-cruiser', 'AAA World Cruiserweight Championship', 'aaa', 'men', 'laredo-kid', 'Laredo Kid', SOURCES.aaaGuerra,
    { rule: 'cruiser', listings: ['aaa', ...WWE_BRANDS], note: 'Título único exibido nas listas de AAA e WWE. Disputas registradas pela AAA.' }),
  singles('aaa-reina', 'AAA Reina de Reinas Championship', 'aaa', 'women', 'flammer', 'Flammer', SOURCES.aaaSnapshot),
  team('aaa-tag', 'AAA World Tag Team Championship', 'aaa', 'men', 'tag', 'Pagano e Psycho Clown', SOURCES.aaaSnapshot, ['pagano', 'psycho-clown']),
  team('aaa-trios', 'AAA World Trios Championship', 'aaa', 'men', 'trios', 'Los Psycho Circus · Dave The Clown, Murder Clown e Panic Clown', SOURCES.aaaSnapshot),
  team('aaa-mixed', 'AAA World Mixed Tag Team Championship', 'aaa', 'mixed', 'tag', 'Chelsea Green e Ethan Page', SOURCES.aaaSnapshot),
  // ROH
  singles('roh-world', 'ROH World Championship', 'roh', 'men', 'bandido', 'Bandido', SOURCES.rohDecember),
  singles('roh-tv', 'ROH World Television Championship', 'roh', 'men', undefined, 'Nick Wayne', SOURCES.rohSnapshot),
  singles('roh-pure', 'ROH Pure Championship', 'roh', 'men', 'lee-moriarty', 'Lee Moriarty', SOURCES.rohDecember, { rule: 'pure' }),
  team('roh-tag', 'ROH World Tag Team Championship', 'roh', 'men', 'tag', 'La Facción Ingobernable · The Beast Mortos e Sammy Guevara', SOURCES.rohDecember, ['beast-mortos', 'sammy-guevara']),
  team('roh-six', 'ROH World Six-Man Tag Team Championship', 'roh', 'men', 'trios', 'Shane Taylor Promotions · Shane Taylor, Carlie Bravo e Shawn Dean', SOURCES.rohDecember),
  singles('roh-women', 'ROH Women’s World Championship', 'roh', 'women', 'athena', 'Athena', SOURCES.rohDecember),
  singles('roh-women-tv', 'ROH Women’s World Television Championship', 'roh', 'women', 'red-velvet', 'Red Velvet', SOURCES.rohDecember),
  singles('roh-women-pure', 'ROH Women’s Pure Championship', 'roh', 'women', 'deonna-purrazzo', 'Deonna Purrazzo', SOURCES.rohDecember, { rule: 'pure' }),
  // BWF
  singles('bwf-brazil', 'Campeonato Brasileiro da BWF', 'bwf', 'men', 'adam-black', 'Adam Black', SOURCES.bwfBrazil),
  singles('bwf-south-america', 'Campeonato Sul-Americano da BWF', 'bwf', 'men', 'allan-sales', 'Allan Sales', SOURCES.bwfSouthAmerica),
  singles('bwf-king', 'BWF Rei do Ringue', 'bwf', 'men', 'yan-karlor', 'Yan Karlor', SOURCES.bwfKing),
  team('bwf-tag', 'Campeonato de Duplas da BWF', 'bwf', 'men', 'tag', 'Brian Racer e Christopher', SOURCES.bwfTag, ['brian-racer', 'christopher-bwf']),
  singles('bwf-supremo', 'Campeão Supremo', 'bwf', 'men', 'victor-boer', 'Victor Boer', SOURCES.bwfSupremo),
  singles('bwf-internet', 'Campeonato Internet', 'bwf', 'men', 'sequela', 'Sequela', SOURCES.bwfInternet),
  singles('bwf-survivor', 'Campeonato Sobrevivente', 'bwf', 'men', 'dillios', 'Dillios', SOURCES.bwfSurvivor),
  singles('bwf-rookies', 'Campeonato de Rookies da BWF', 'bwf', 'men', undefined, null, SOURCES.bwfRookies, { vacant: true, rule: 'rookies' }),
  singles('bwf-maremoto', 'Campeonato Maremoto', 'bwf', 'men', undefined, null, SOURCES.bwfMaremoto,
    { status: 'unverified', rule: 'maremoto', note: 'A BWF documenta o cinturão e o direito a um desafio. O estado em 01/01/2026 está a confirmar.' }),
]

export const TITLES_BY_ID = new Map(OPENING_TITLES.map(title => [title.id, title]))

export function supportsDefense(title: TitleRecord) {
  return title.status === 'active' && title.rule === 'singles' && (title.holderId !== undefined || title.vacant === true)
}

export function supportsTagDefense(title: TitleRecord) {
  return title.status === 'active' && title.rule === 'tag' && title.division !== 'mixed' && title.holderTeam !== undefined
}
