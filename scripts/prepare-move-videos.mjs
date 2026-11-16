// Renders the game's original pose sequences as small, silent MP4 files with FFmpeg (librsvg and libx264).
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { demos } from '../src/content/move-demos.mjs'

const postures = {
  stand: [[-16,-10,-15,1], [17,-9,23,-17], [-8,15,-10,33], [10,16,16,32]],
  punch: [[-14,-8,-7,-15], [21,-23,45,-23], [-8,15,-11,33], [11,16,19,31]],
  wind: [[-22,-28,-38,-22], [14,-13,17,-26], [-10,15,-14,33], [13,14,17,31]],
  chop: [[-16,-10,-12,2], [20,-22,45,-25], [-10,15,-12,32], [10,17,22,33]],
  lowkick: [[-21,-18,-30,-26], [17,-8,25,-13], [-8,16,-10,32], [24,10,44,14]],
  highkick: [[-17,-8,-28,-10], [17,-8,22,-3], [-9,14,-10,32], [23,-7,42,-25]],
  tuck: [[-16,-10,-7,-1], [16,-12,24,3], [-11,-2,-22,13], [15,-4,6,13]],
  drop: [[-16,-12,-20,-4], [16,-10,20,-2], [-7,20,-9,43], [11,22,15,44]],
  kneel: [[-15,-10,-14,0], [16,-11,23,-10], [-11,15,-22,15], [17,5,18,20]],
  upper: [[-15,-12,-9,-20], [23,-15,27,-38], [-8,16,-10,33], [11,16,18,31]],
  bar: [[-15,-11,-12,0], [24,-25,48,-24], [-8,16,-9,32], [10,15,18,32]],
  run: [[-19,-9,-27,-17], [22,-16,29,-28], [-14,9,-24,20], [18,10,19,27]],
  grab: [[-10,-11,10,-14], [20,-16,34,-18], [-10,15,-13,33], [13,15,17,30]],
  over: [[-14,-34,-10,-49], [19,-35,22,-48], [-8,16,-11,32], [12,16,16,32]],
  scoop: [[-12,-14,4,-27], [20,-15,39,-27], [-9,15,-12,32], [11,16,16,33]],
  turn: [[-18,-16,-14,-26], [13,-9,5,-3], [-8,15,-12,32], [12,16,15,33]],
  sit: [[-17,-8,-13,0], [19,-10,25,-13], [-10,7,-22,9], [19,9,37,9]],
  oneleg: [[-13,-9,-12,-1], [14,-10,20,-13], [-9,15,-13,31], [14,8,23,16]],
  arch: [[-14,-19,-19,-29], [18,-19,25,-28], [-11,18,-17,29], [15,17,23,29]],
  elbow: [[-14,-9,-18,0], [25,-19,8,-29], [-9,14,-12,30], [11,16,18,30]],
  hook: [[-14,-9,-18,0], [22,-26,31,-31], [-9,15,-14,30], [12,14,20,30]],
}
const mix = (a, b, t) => a + (b - a) * t
function wrestler(a, b, t, color, flip) {
  const [x, y, rotation] = a.slice(0, 3).map((value, i) => mix(value, b[i], t))
  const limbs = postures[a[3]].map((joint, i) => joint.map((value, j) => mix(value, postures[b[3]][i][j], t)))
  const lines = limbs.map(([x1,y1,x2,y2], i) => {
    const [startX,startY] = i < 2 ? [i ? 11 : -11, -20] : [i === 3 ? 5 : -5, 0]
    return `<path d="M${startX} ${startY} L${x1} ${y1} L${x2} ${y2}"/>`
  }).join('')
  return `<g transform="translate(${x} ${y}) scale(${flip} 1) rotate(${rotation})" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="#151821" stroke-width="9" fill="none">${lines}</g><g stroke="${color}" stroke-width="6" fill="none">${lines}</g>
    <path d="M-12 -22 Q0 -29 12 -22 L9 4 Q0 8 -9 4Z" fill="${color}" stroke="#11131b" stroke-width="2"/>
    <path d="M-9-2H9V4Q0 8-9 4Z" fill="#171a21" opacity=".73"/>
    <path d="M-8-21Q0-24 8-21" fill="none" stroke="#fff" stroke-opacity=".58" stroke-width="1.25"/>
    <circle cy="-35" r="8" fill="#edd0b4" stroke="#13151b" stroke-width="2"/>
  </g>`
}
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
function frame(frames, time, corner) {
  const next = frames.findIndex(point => point.time >= time)
  const index = next < 0 ? frames.length - 1 : Math.max(1, next)
  const before = frames[index - 1], after = frames[index]
  const blend = Math.min(1, Math.max(0, (time - before.time) / (after.time - before.time)))
  const t = blend * blend * (3 - 2 * blend)
  const caption = frames.slice(0, index + 1).findLast(point => point.caption && point.time <= time + .09)?.caption ?? ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="288" viewBox="0 0 320 192">
  <defs><linearGradient id="canvas" x2="0" y2="1"><stop stop-color="#424d4d"/><stop offset="1" stop-color="#262f32"/></linearGradient>
  <linearGradient id="arena" x2="0" y2="1"><stop stop-color="#141a21"/><stop offset="1" stop-color="#262b31"/></linearGradient></defs>
  <rect width="320" height="192" fill="url(#arena)"/>
  <path d="M36 110H284L312 170H8Z" fill="url(#canvas)" stroke="#899891" stroke-width="1.4"/>
  <path d="M8 170H312V177H8Z" fill="#293238"/><path d="M8 170H312" stroke="#a6b4ae" stroke-width="1.5"/>
  <path d="M30 61V118 M290 61V118" stroke="#9ba8a1" stroke-width="5"/>
  <path d="M30 65H290 M30 82H290 M30 99H290" stroke="#aebcaf" stroke-width="2" opacity=".76"/>
  ${corner ? '<path d="M77 77V140 M62 79H86 M62 95H86 M62 111H86" stroke="#cbd996" stroke-width="4"/>' : ''}
  <ellipse cx="${mix(before.defender[0], after.defender[0], t)}" cy="162" rx="23" ry="4" fill="#11141a" opacity=".42"/>
  <ellipse cx="${mix(before.attacker[0], after.attacker[0], t)}" cy="164" rx="22" ry="4" fill="#11141a" opacity=".47"/>
  ${wrestler(before.defender, after.defender, t, '#f4a17e', -1)}
  ${wrestler(before.attacker, after.attacker, t, '#def36c', 1)}
  <rect x="0" y="177" width="320" height="15" fill="#11161b"/>
  <text x="160" y="188" text-anchor="middle" fill="#f3f4ea" font-size="9.5" font-family="sans-serif">${esc(caption)}</text>
  </svg>`
}

const out = new URL('../public/moves/', import.meta.url)
mkdirSync(out, { recursive: true })
const directory = mkdtempSync(join(tmpdir(), 'wl-move-video-'))
try {
  for (const [id, frames] of Object.entries(demos)) {
    const requested = process.argv.slice(2)
    if (requested.length ? !requested.includes(id) : ['dropkick', 'german', 'spear'].includes(id)) continue
    const fps = 24
    const end = frames.at(-1).time
    const count = Math.ceil((end + .35) * fps)
    for (let index = 0; index < count; index++) {
      const svg = join(directory, String(index).padStart(3, '0') + '.svg')
      writeFileSync(svg, frame(frames, Math.min(index / fps, end), ['crossbody', 'moonsault', 'elbow', 'splash'].includes(id)))
    }
    const target = new URL(id + '.mp4', out)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(directory, '%03d.svg'),
      '-frames:v', String(count), '-c:v', 'libx264', '-profile:v', 'baseline', '-pix_fmt', 'yuv420p',
      '-crf', '28', '-movflags', '+faststart', target.pathname], { stdio: 'inherit' })
    process.stdout.write(id + '\n')
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
