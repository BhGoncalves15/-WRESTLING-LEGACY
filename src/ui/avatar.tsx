import { useId, type ReactNode } from 'react'
import { defaultAppearance, type Appearance } from '../domain/appearance'

const bodies = { lean: [30, 24, 13], athletic: [36, 24, 16], broad: [43, 27, 18], stocky: [39, 32, 19] } as const
const faces = { oval: [17, 23], square: [19, 22], round: [20, 20], long: [16, 25] } as const

export function WrestlerArt({ look, back = false, portrait = false, zoom = false }: {
  look: Appearance; back?: boolean; portrait?: boolean; zoom?: boolean
}) {
  const id = useId()
  const skin = 'url(#' + id + '-skin)'
  const cloth = 'url(#' + id + '-cloth)'
  const [baseShoulder, waist, thigh] = bodies[look.build]
  const shoulder = baseShoulder + (look.proportions === 'shoulders' ? 6 : 0)
  const [faceWidth, faceHeight] = faces[look.face]
  const chin = 55 + faceHeight
  const hip = look.proportions === 'longlegs' ? 152 : 166
  const knee = look.proportions === 'longlegs' ? 205 : 213
  const boot = look.boots === 'short' ? 238 : 222
  const hand = look.proportions === 'longarms' ? 176 : 163
  const hem = look.top === 'singlet' ? hip + 10 : hip - 14
  const cuff = look.bottom === 'trunks' ? hip + 11 : look.bottom === 'shorts' ? knee - 20 : look.bottom === 'board' ? knee - 4 : boot
  const hairTail = look.hairLength === 'long' ? 92 : look.hairLength === 'medium' ? 75 : 58
  const hairBump = { straight: 0, wavy: 3, curly: 7, coily: 10 }[look.hairType]
  const eyeHeight = { almond: 2.6, round: 4.2, narrow: 1.7 }[look.eyeShape]
  const crown = 'M ' + (100 - faceWidth) + ' 53 Q 79 ' + (24 - hairBump) + ' 102 ' + (32 - hairBump)
    + ' Q 124 ' + (30 - hairBump) + ' ' + (100 + faceWidth) + ' 54'
  const backHair = look.haircut === 'loose' || look.haircut === 'tied' ? hairTail + 3
    : look.hairLength === 'long' ? 72 : look.hairLength === 'medium' ? 61 : 56
  const strand = {
    cropped: 'M82 50 Q81 32 100 ' + (33 - hairBump / 2) + ' Q118 33 118 50 L113 46 Q100 39 87 46Z',
    fade: crown + ' L117 53 L113 46 Q100 38 87 46 L83 53Z',
    swept: 'M82 53 Q77 34 96 ' + (29 - hairBump) + ' Q115 31 125 27 Q123 42 111 47 Q99 39 82 53Z',
    fringe: crown + ' L117 56 L111 49 L105 54 L99 47 L91 55 L83 50Z',
    tied: crown + ' L117 46 Q99 41 83 47Z',
    loose: crown + ' L122 ' + hairTail + ' L113 ' + (hairTail - 4) + ' L116 48 Q96 43 85 53 L86 ' + hairTail + ' L78 ' + (hairTail + 2) + 'Z',
  }[look.haircut]
  const arms = (side: number) => {
    const x = (offset: number) => 100 + side * offset
    const elbow = shoulder + 6
    const fist = shoulder + 16
    return <>
      <path fill={skin} d={`M${x(shoulder - 9)} 87 Q${x(shoulder + 7)} 88 ${x(shoulder + 8)} 104 L${x(elbow + 5)} 127
        L${x(fist + 5)} ${hand - 8} Q${x(fist + 9)} ${hand + 5} ${x(fist + 1)} ${hand + 6}
        Q${x(fist - 8)} ${hand + 4} ${x(fist - 7)} ${hand - 6} L${x(elbow - 6)} 133 L${x(shoulder - 9)} 112Z`} />
      {(look.top === 'shirt' || look.top === 'jacket') && <path fill={cloth} d={`M${x(shoulder - 10)} 87 Q${x(shoulder + 6)} 85 ${x(shoulder + 8)} 101
        L${x(elbow + 5)} ${look.top === 'jacket' ? hand - 11 : 111} L${x(shoulder - 3)} ${look.top === 'jacket' ? hand - 7 : 116}Z`} />}
      {(look.pads === 'elbows' || look.pads === 'both') && <ellipse cx={x(elbow)} cy={129} rx={8} ry={9} fill="#242834" />}
      {look.accessory === 'armband' && side === 1 && <path d={`M${x(shoulder - 4)} 113 l15 -4`} stroke={look.accent} strokeWidth={5} />}
      {look.gloves !== 'none' && <rect x={x(fist) - 7} y={hand - 10} width={14} height={look.gloves === 'wrap' ? 7 : look.gloves === 'fingerless' ? 13 : 17}
        rx={4} fill={look.gloves === 'wrap' ? look.accent : cloth} />}
    </>
  }
  const legs = (side: number) => {
    const x = (offset: number) => 100 + side * offset
    return <>
      <path fill={skin} d={`M${x(waist)} ${hip - 8} Q${x(waist + 2)} ${hip + 9} ${x(thigh + 8)} ${knee}
        L${x(thigh + 9)} 250 L${x(10)} 250 L${x(9)} ${knee} L${x(2)} ${hip + 8}Z`} />
      <path fill={cloth} d={`M${x(waist + 1)} ${hip - 11} L${x(thigh + 10)} ${cuff}
        Q${x(thigh)} ${cuff + 4} ${x(look.bottom === 'tights' ? 8 : 6)} ${cuff + 1} L${x(0)} ${hip + 2}Z`} />
      <path d={`M${x(waist - 1)} ${hip} L${x(thigh + 7)} ${cuff - 1}`} stroke={look.accent} strokeWidth={look.bottom === 'tights' ? 4 : 3} fill="none" />
      {(look.pads === 'knees' || look.pads === 'both') && <ellipse cx={x(thigh)} cy={knee + 1} rx={11} ry={9} fill="#222630" stroke={look.accent} strokeWidth={1.5} />}
      <path fill="#212633" d={`M${x(thigh + 9)} ${boot} L${x(thigh + 11)} 256 L${x(thigh + 18)} 261
        Q${x(thigh + 20)} 269 ${x(thigh + 10)} 271 L${x(7)} 271 Q${x(4)} 269 ${x(7)} 259 L${x(8)} ${boot}Z`} />
      <path d={`M${x(9)} ${boot + 3} L${x(thigh + 8)} ${boot + 3}`} stroke={look.accent} strokeWidth={2.5} />
      {look.boots === 'laced' && !back && [233, 239, 245, 251].map(y => <path key={y} d={`M${x(thigh - 4)} ${y} l${side * 8} 2`} stroke="#e1d7c8" strokeWidth={1.4} />)}
    </>
  }
  const scale = portrait ? 1 : look.heightCm / 178
  const offset = 274 * (1 - scale)
  return <svg className="wrestler-art" viewBox={portrait ? '66 18 68 82' : zoom
    ? `40 ${offset + 15 * scale} 120 ${165 * scale}` : '0 -43 200 329'} aria-hidden="true">
    <defs>
      <linearGradient id={id + '-skin'} x1="0%" y1="0%" x2="100%" y2="30%">
        <stop stopColor={look.skin} /><stop offset=".52" stopColor={look.skin} /><stop offset="1" stopColor="#21111a" stopOpacity=".72" />
      </linearGradient>
      <linearGradient id={id + '-cloth'} x1="0%" y1="0%" x2="95%" y2="100%">
        <stop stopColor={look.primary} /><stop offset=".64" stopColor={look.primary} /><stop offset="1" stopColor="#11131c" />
      </linearGradient>
    </defs>
    {!portrait && <ellipse cx="100" cy="274" rx="55" ry="6" fill="#090a0b" opacity=".64" />}
    <g transform={`translate(0 ${offset}) scale(1 ${scale})`} strokeLinejoin="round">
      <g stroke="#17161b" strokeWidth={1.45}>
        {legs(-1)}{legs(1)}{arms(-1)}{arms(1)}
        <path fill={skin} d={`M87 71 L86 82 Q${100 - shoulder} 84 ${100 - shoulder} 99
          Q${100 - waist - 4} 126 ${100 - waist} ${hip - 6} Q100 ${hip + 6} ${100 + waist} ${hip - 6}
          Q${100 + waist + 4} 126 ${100 + shoulder} 99 Q${100 + shoulder} 84 114 82 L113 71Z`} />
        {look.top === 'none'
          ? <path d={back ? 'M79 99 Q88 114 99 112 Q111 114 121 99 M100 105 V145'
            : 'M76 104 Q86 113 97 106 M103 106 Q114 113 124 104 M100 117 V141 M91 126 H109 M91 136 H109'}
            fill="none" stroke="#2b171b" strokeWidth={2} opacity=".37" />
          : <path fill={cloth} d={`M${100 - shoulder} 92 L87 82 Q100 ${look.top === 'singlet' ? 111 : 98} 113 82 L${100 + shoulder} 92
            L${100 + waist + 4} ${hem} Q100 ${hem + 6} ${100 - waist - 4} ${hem}Z`} />}
        {look.top === 'jacket' && !back && <path d={`M100 97 V${hem} M86 84 L79 105 L95 111 M114 84 L121 105 L105 111`} fill="none" stroke={look.accent} strokeWidth={2.5} />}
        {look.top === 'singlet' && <path d={`M83 85 L${100 - waist + 4} ${hip} M117 85 L${100 + waist - 4} ${hip}`} stroke={look.accent} strokeWidth={3} />}
        {look.top === 'shirt' && <path d={back ? 'M87 103 H113 M92 110 H108' : 'M93 106 L100 99 L107 106 L100 113Z'} stroke={look.accent} fill="none" strokeWidth={2} />}
        {look.top !== 'singlet' && <path d={`M${100 - waist} ${hip - 7} Q100 ${hip - 2} ${100 + waist} ${hip - 7}`} stroke={look.accent} strokeWidth={3} fill="none" />}
        {look.haircut === 'tied' && <path fill={look.hair} d={`M107 38 Q131 31 127 ${hairTail + 17} Q114 ${hairTail + 10} 112 54Z`} />}
        <ellipse cx={100 - faceWidth} cy={57} rx={4} ry={6} fill={look.skin} /><ellipse cx={100 + faceWidth} cy={57} rx={4} ry={6} fill={skin} />
        {look.face === 'square'
          ? <path d={`M82 44 Q100 28 118 44 L117 68 L109 ${chin} H91 L83 68Z`} fill={skin} />
          : <ellipse cx="100" cy="55" rx={faceWidth} ry={faceHeight} fill={skin} />}
        <path fill={look.hair} d={back ? crown + ` Q120 ${backHair} 100 ${backHair} Q80 ${backHair} ${100 - faceWidth} 53Z` : strand} />
        {look.haircut !== 'cropped' && hairBump > 0 && [86, 93, 101, 109, 116].map((x, index) =>
          <path key={x} d={`M${x - 3} ${40 - hairBump / 2 + Math.abs(index - 2) * 1.7} q3 -${hairBump} 6 0`}
            stroke="#ffffff" strokeOpacity=".22" fill="none" strokeWidth={1.3} />)}
      </g>
      {look.accessory === 'chain' && <path d={back ? 'M87 83 Q100 91 113 83' : 'M87 83 Q100 107 113 83'} fill="none" stroke="#ecc877" strokeWidth={2.5} />}
      {!back && <>
        {look.beard !== 'none' && <path d={look.beard === 'goatee' ? 'M94 69 Q100 74 106 69 L105 78 Q100 82 95 78Z'
          : `M${100 - faceWidth + 1} 59 Q88 72 100 72 Q112 72 ${100 + faceWidth - 1} 59 Q114 ${chin + 5} 100 ${chin + 2} Q86 ${chin + 5} ${100 - faceWidth + 1} 59Z`}
          fill={look.hair} opacity={look.beard === 'stubble' ? .38 : .95} />}
        {look.moustache !== 'none' && <path d="M93 66 Q97 63 100 65 Q103 63 107 66" fill="none" stroke={look.hair} strokeWidth={look.moustache === 'fine' ? 1.3 : 3} />}
        {look.mask !== 'none' && look.mask !== 'visor' && <path fill={cloth} stroke={look.accent} strokeWidth={2}
          d={look.mask === 'lucha' ? 'M82 49 Q100 37 118 49 L117 68 L108 77 L106 66 H94 L92 77 L83 68Z' : 'M82 48 Q100 37 118 48 L117 60 L110 63 L101 58 L90 63 L83 60Z'} />}
        {[91, 109].map(x => <g key={x}>
          <path d={look.brows === 'arched' ? `M${x - 5} 49 q5 -4 10 0` : `M${x - 5} 49 h10`}
            fill="none" stroke={look.hair} strokeWidth={look.brows === 'thick' ? 3 : 1.7} />
          <ellipse cx={x} cy={54} rx={5.2} ry={eyeHeight} fill="#fff3df" />
          <circle cx={x + .6} cy="54" r={Math.min(2.1, eyeHeight)} fill={look.eyes} />
        </g>)}
        <path d="M101 55 l-3 6 h4 M96 70 q4 2 8 0" fill="none" stroke="#391c20" opacity=".7" strokeWidth={1.2} />
        {(look.accessory === 'glasses' || look.mask === 'visor') && <path d="M81 50 Q100 46 119 50 L116 59 H106 L100 54 L94 59 H84Z"
          fill={look.mask === 'visor' ? cloth : '#202433'} fillOpacity=".85" stroke={look.accent} strokeWidth={1.3} />}
      </>}
      {back && look.mask !== 'none' && <path d="M84 50 Q100 54 116 50" fill="none" stroke={look.accent} strokeWidth={2.8} />}
      {look.accessory === 'bandana' && <path d={back ? 'M82 45 Q100 50 118 45 L120 56 L116 52 L113 58 L111 49' : 'M82 45 Q100 41 118 45 L117 49 Q100 45 83 49Z'}
        fill={look.accent} stroke={look.accent} strokeWidth={2} />}
    </g>
  </svg>
}

export function FighterAvatar({ name, look }: { name: string; look?: Appearance }) {
  return <span className={'fighter-avatar' + (look ? ' illustrated' : '')} aria-hidden="true">
    {look ? <WrestlerArt look={look} portrait /> : name.slice(0, 2).toUpperCase()}
  </span>
}

export function AvatarPreview({ look, back, zoom, controls }: { look?: Appearance; back: boolean; zoom: boolean; controls: ReactNode }) {
  return <div className="avatar-preview">
    <div className="avatar-stage"><WrestlerArt look={look ?? defaultAppearance()} back={back} zoom={zoom} /></div>
    {controls}
  </div>
}
