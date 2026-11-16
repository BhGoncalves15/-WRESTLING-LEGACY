import { useId } from 'react'
import type { BeltArtwork } from '../domain/belt-art'

const shapes: Record<BeltArtwork['plate'], string> = {
  shield: 'M-106-58 Q-67-64 0-78 Q67-64 106-58 L101 22 Q70 66 0 81 Q-70 66-101 22Z',
  oval: 'M0-78 C145-78 145 78 0 78 C-145 78-145-78 0-78Z',
  octagon: 'M-70-74H70L111-39V37L70 75H-70L-111 37V-39Z',
  crest: 'M0-77 Q46-58 84-70 L113-27 L99 42 L54 55 L0 79 L-54 55 L-99 42 L-113-27 L-84-70 Q-46-58 0-77Z',
  baroque: 'M-121-30 Q-97-40-89-66 Q-42-58 0-83 Q42-58 89-66 Q97-40 121-30 L112 24 Q90 35 88 61 Q36 56 0 83 Q-36 56-88 61 Q-90 35-112 24Z',
  plaque: 'M-98-70H98L120-51V49L95 70H-95L-120 49V-51Z',
  sunstone: 'M0-82 L21-76 39-77 57-65 77-59 85-42 109-29 109-10 117 8 108 26 92 38 81 57 62 64 43 77 21 74 0 82 -21 74 -43 77 -62 64 -81 57 -92 38 -108 26 -117 8 -109-10 -109-29 -85-42 -77-59 -57-65 -39-77 -21-76Z',
}

const straps: Record<BeltArtwork['strap'], [string, string]> = {
  ink: ['#454049', '#15121b'], oxblood: ['#752f36', '#261115'], indigo: ['#3f4d75', '#12192d'],
  ivory: ['#e1d5bc', '#776b52'], forest: ['#415847', '#171f19'],
}

const metals: Record<BeltArtwork['metal'], [string, string, string]> = {
  gold: ['#fff0ad', '#c4913c', '#684018'], silver: ['#ecf1f4', '#a3a8ad', '#555361'],
  bronze: ['#ffc794', '#ad6947', '#5d3028'],
}

function Emblem({ motif }: { motif: BeltArtwork['motif'] }) {
  if (motif === 'interlocked') return <g fill="none" strokeWidth={6}>
    <circle cx="-16" cy="-2" r="17" /><circle cx="16" cy="-2" r="17" />
  </g>
  if (motif === 'crown') return <path d="M-34-14 L-18-5 L0-24 L18-5 L34-14 L27 17 H-27Z" />
  if (motif === 'diamond') return <path d="M0-26 L35-1 L0 24 L-35-1Z M0-16 L20-1 L0 14 L-20-1Z" fillRule="evenodd" />
  if (motif === 'wings') return <path d="M-49-15 Q-22-14 0 6 Q22-14 49-15 L34 6 L13 14 L0 23 L-13 14 L-34 6Z" />
  return <g>
    <circle r="15" fill="none" strokeWidth="5" />
    {Array.from({ length: 12 }, (_, index) => <path key={index} d="M0-29V-22" transform={'rotate(' + index * 30 + ')'} strokeWidth="2.5" />)}
  </g>
}

function Engraving({ company }: { company: BeltArtwork['company'] }) {
  switch (company) {
    case 'wwe':
      return <path d="M-89-26L-68 3-57-11M89-26L68 3 57-11M-78-33L-67-19M78-33L67-19M-49-54H49" />
    case 'aew':
      return <g>
        <path d="M-98-24 C-63-67-40-44-53-25 S-84-10-84 0 C-72 8-63 5-56 12M98-24 C63-67 40-44 53-25 S84-10 84 0 C72 8 63 5 56 12" />
        <path d="M-50-50 Q0-76 50-50 M-55-55 Q0-81 55-55" />
        <circle cx="-74" cy="-10" r="6" /><circle cx="74" cy="-10" r="6" />
      </g>
    case 'njpw':
      return <g>
        <path d="M-84 6Q-89-31-67-52M84 6Q89-31 67-52M-80-14L-96-28 M-78-27L-89-44 M80-14L96-28 M78-27L89-44M-66-48Q0-78 66-48" />
        <path d="M-70-18Q-70-31-52-37M70-18Q70-31 52-37" />
      </g>
    case 'tna':
      return <path d="M-101-36 L-61-12 -93-6 -65 15 M101-36 L61-12 93-6 65 15 M-38-57H38M-49-53H49" />
    case 'aaa':
      return <path d="M-94 8L-75-31-56 8H-67L-75-11-84 8ZM94 8L75-31 56 8H67L75-11 84 8ZM-54-43L-37-57 -20-49 M54-43L37-57 20-49" />
    case 'roh':
      return <path d="M-95-13 L-76-29-60-14-76 2Z M95-13 L76-29 60-14 76 2Z M-60-46H-40 M60-46H40 M-46-56H46" />
    case 'bwf':
      return <path d="M-73-33L-66-18-50-17-62-6-59 10-73 3-87 10-84-6-96-17-80-18Z M73-33L80-18 96-17 84-6 87 10 73 3 59 10 62-6 50-17 66-18Z M-42-54H42" />
    default:
      return null
  }
}

function linesOf(name: string) {
  if (name.length <= 24) return [name]
  const midpoint = Math.floor(name.length / 2)
  const before = name.lastIndexOf(' ', midpoint)
  const after = name.indexOf(' ', midpoint)
  if (before === -1 && after === -1) return [name]
  const breakAt = after === -1 || (before !== -1 && midpoint - before <= after - midpoint) ? before : after
  return [name.slice(0, breakAt), name.slice(breakAt + 1)]
}

export function SimulatedBelt({ artwork, name, initials, reference = false }: {
  artwork: BeltArtwork; name: string; initials: string; reference?: boolean
}) {
  const id = useId()
  const [shine, metal, shade] = metals[artwork.metal]
  const [leather, seam] = straps[artwork.strap]
  const strap = 'M22 87 Q116 83 196 68 Q250 48 320 49 Q390 48 444 68 Q524 83 618 87 L610 145 Q514 144 444 159 Q390 180 320 181 Q250 180 196 159 Q126 144 30 145Z'
  const plate = shapes[artwork.plate]
  const sidePlates = artwork.sidePlates === 4 ? [107, 176, 464, 533] : [149, 491]
  const lettering = artwork.lettering === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'
  const sideShape = artwork.company === 'roh' || artwork.company === 'tna'
    ? 'M-24-28H24L29-15V15L23 27H-23L-29 15V-15Z'
    : artwork.company === 'aaa' || artwork.company === 'njpw'
      ? 'M0-31 Q28-30 28 0 Q28 30 0 31 Q-28 30-28 0 Q-28-30 0-31Z'
      : 'M-25-25 Q0-37 25-25 L23 23 Q0 34-23 23Z'
  return <svg viewBox="0 0 640 224" className="belt-render" role="img"
    aria-label={(reference ? 'Ilustração de referência do ' : 'Design fictício do ') + name}>
    <defs>
      <linearGradient id={id + '-metal'} x1="14%" y1="10%" x2="85%" y2="88%">
        <stop stopColor={shade} /><stop offset=".22" stopColor={shine} /><stop offset=".48" stopColor={metal} />
        <stop offset=".65" stopColor={shine} /><stop offset="1" stopColor={shade} />
      </linearGradient>
      <linearGradient id={id + '-leather'} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={leather} /><stop offset=".52" stopColor={seam} /><stop offset="1" stopColor={leather} />
      </linearGradient>
      <radialGradient id={id + '-enamel'}>
        <stop stopColor={artwork.accent} stopOpacity=".62" /><stop offset="1" stopColor="#20181a" />
      </radialGradient>
      <pattern id={id + '-engraved'} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <path d="M0 0V6" stroke={shine} strokeOpacity=".37" strokeWidth="1.2" />
      </pattern>
    </defs>
    <ellipse cx="320" cy="188" rx="260" ry="13" fill="#241c17" opacity=".13" />
    <path d={strap} fill={'url(#' + id + '-leather)'} stroke="#070809" strokeWidth="5" />
    <path d={strap} fill="none" stroke={metal} strokeOpacity=".4" strokeWidth="1.6" strokeDasharray="2.5 3.6" transform="translate(6 4) scale(.98 .966)" />
    {[44, 58, 73, 567, 582, 596].flatMap(x => [107, 125].map(y =>
      <circle key={x + ':' + y} cx={x} cy={y} r="3.1" fill="#14110e" stroke={metal} strokeWidth="1" />))}
    {sidePlates.map((x, index) => <g key={x} transform={`translate(${x} 115) scale(${index === 0 || index === sidePlates.length - 1 ? .87 : 1})`}>
      <path d={sideShape} fill={'url(#' + id + '-metal)'} stroke={shade} strokeWidth="2" />
      <path d={sideShape} transform="scale(.75)" fill={'url(#' + id + '-enamel)'} stroke={shine} strokeWidth="1.4" />
      <g transform="scale(.46)" stroke={shine} fill={metal}><Emblem motif={artwork.motif === 'interlocked' ? 'diamond' : artwork.motif} /></g>
    </g>)}
    <g transform="translate(320 114)">
      <path d={plate} fill={'url(#' + id + '-metal)'} stroke={shade} strokeWidth="4" />
      <path d={plate} transform="scale(.94)" fill={'url(#' + id + '-engraved)'} stroke={shine} strokeWidth="1.3" />
      <path d={plate} transform="scale(.80)" fill={'url(#' + id + '-enamel)'} stroke={shade} strokeWidth="2.3" />
      <path d={plate} transform="scale(.74)" fill="none" stroke={metal} strokeWidth="1.2" strokeDasharray="1 4" />
      <g fill="none" stroke={shine} strokeWidth="2.1" opacity=".82"><Engraving company={artwork.company} /></g>
      <g transform="translate(0 -9) scale(.89)" stroke={shine} fill={metal}><Emblem motif={artwork.motif} /></g>
      <text x="0" y="-40" fill={shine} textAnchor="middle" fontFamily={lettering} fontSize="13" fontWeight="700" letterSpacing="2">{initials}</text>
      <path d="M-86 19H86L77 47Q0 56-77 47Z" fill="#161111" stroke={metal} strokeWidth="1.6" />
      {linesOf(name.replace(/ \(Unificado\)$/, '').toUpperCase()).map((line, index, lines) => <text key={index} x="0" y={lines.length === 1 ? 39 : 32 + index * 13}
        fill={shine} textAnchor="middle" fontFamily={lettering} fontSize={Math.min(11.5, 215 / line.length)} fontWeight="700">{line}</text>)}
    </g>
  </svg>
}
