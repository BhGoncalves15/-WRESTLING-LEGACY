import { useId } from 'react'
import type { BeltArtwork } from '../domain/belt-art'

const shapes: Record<BeltArtwork['plate'], string> = {
  shield: 'M-106-58 Q-67-64 0-78 Q67-64 106-58 L101 22 Q70 66 0 81 Q-70 66-101 22Z',
  oval: 'M0-78 C145-78 145 78 0 78 C-145 78-145-78 0-78Z',
  octagon: 'M-70-74H70L111-39V37L70 75H-70L-111 37V-39Z',
  crest: 'M0-77 Q46-58 84-70 L113-27 L99 42 L54 55 L0 79 L-54 55 L-99 42 L-113-27 L-84-70 Q-46-58 0-77Z',
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

function linesOf(name: string) {
  if (name.length <= 24) return [name]
  const midpoint = Math.floor(name.length / 2)
  const before = name.lastIndexOf(' ', midpoint)
  const after = name.indexOf(' ', midpoint)
  if (before === -1 && after === -1) return [name]
  const breakAt = after === -1 || (before !== -1 && midpoint - before <= after - midpoint) ? before : after
  return [name.slice(0, breakAt), name.slice(breakAt + 1)]
}

export function SimulatedBelt({ artwork, name, initials }: { artwork: BeltArtwork; name: string; initials: string }) {
  const id = useId()
  const [shine, metal, shade] = metals[artwork.metal]
  const [leather, seam] = straps[artwork.strap]
  const strap = 'M22 87 Q116 83 196 68 Q250 48 320 49 Q390 48 444 68 Q524 83 618 87 L610 145 Q514 144 444 159 Q390 180 320 181 Q250 180 196 159 Q126 144 30 145Z'
  const plate = shapes[artwork.plate]
  const sidePlates = artwork.sidePlates === 4 ? [106, 171, 469, 534] : [146, 494]
  const lettering = artwork.lettering === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'
  return <svg viewBox="0 0 640 230" className="belt-render" role="img" aria-label={'Design fictício do ' + name}>
    <defs>
      <linearGradient id={id + '-metal'} x1="14%" y1="10%" x2="85%" y2="88%">
        <stop stopColor={shade} /><stop offset=".22" stopColor={shine} /><stop offset=".48" stopColor={metal} />
        <stop offset=".65" stopColor={shine} /><stop offset="1" stopColor={shade} />
      </linearGradient>
      <linearGradient id={id + '-leather'} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={leather} /><stop offset=".52" stopColor={seam} /><stop offset="1" stopColor={leather} />
      </linearGradient>
      <radialGradient id={id + '-enamel'}>
        <stop stopColor={artwork.accent} stopOpacity=".7" /><stop offset="1" stopColor={seam} />
      </radialGradient>
      <pattern id={id + '-engraved'} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <path d="M0 0V6" stroke={shine} strokeOpacity=".37" strokeWidth="1.2" />
      </pattern>
    </defs>
    <ellipse cx="320" cy="186" rx="240" ry="19" fill="#070806" opacity=".6" />
    <path d={strap} fill={'url(#' + id + '-leather)'} stroke="#070809" strokeWidth="5" />
    <path d={strap} fill="none" stroke={metal} strokeOpacity=".4" strokeWidth="1.6" strokeDasharray="2.5 3.6" transform="translate(6 4) scale(.98 .966)" />
    {[44, 58, 73, 567, 582, 596].map(x => <circle key={x} cx={x} cy="116" r="3.4" fill="#14110e" stroke={shade} />)}
    {sidePlates.map((x, index) => <g key={x} transform={`translate(${x} 115) scale(${index === 0 || index === sidePlates.length - 1 ? .87 : 1})`}>
      <path d="M-25-25 Q0-37 25-25 L23 23 Q0 34-23 23Z" fill={'url(#' + id + '-metal)'} stroke={shade} strokeWidth="2" />
      <ellipse ry="18" rx="16" fill={'url(#' + id + '-enamel)'} stroke={shine} strokeWidth="1.4" />
      <path d="M0-12 L9 0 L0 12 L-9 0Z" fill={metal} stroke={shine} />
    </g>)}
    <g transform="translate(320 114)">
      <path d={plate} fill={'url(#' + id + '-metal)'} stroke={shade} strokeWidth="4" />
      <path d={plate} transform="scale(.94)" fill={'url(#' + id + '-engraved)'} stroke={shine} strokeWidth="1.3" />
      <path d={plate} transform="scale(.80)" fill={'url(#' + id + '-enamel)'} stroke={shade} strokeWidth="2.3" />
      <path d={plate} transform="scale(.74)" fill="none" stroke={metal} strokeWidth="1.2" strokeDasharray="1 4" />
      <g transform="translate(0 -8)" stroke={shine} fill={metal}><Emblem motif={artwork.motif} /></g>
      <text x="0" y="-39" fill={shine} textAnchor="middle" fontFamily={lettering} fontSize="12" fontWeight="700" letterSpacing="2">{initials}</text>
      <rect x="-86" y="18" width="172" height="34" rx="5" fill="#161111" stroke={metal} strokeWidth="1.3" />
      {linesOf(name.toUpperCase()).map((line, index, lines) => <text key={line} x="0" y={lines.length === 1 ? 39 : 32 + index * 13}
        fill={shine} textAnchor="middle" fontFamily={lettering} fontSize={Math.min(10, 215 / line.length)} fontWeight="700">{line}</text>)}
    </g>
  </svg>
}
