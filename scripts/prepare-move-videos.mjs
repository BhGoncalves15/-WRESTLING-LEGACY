// Renders the game's original pose sequences as small, silent MP4 files with Inkscape and FFmpeg.
import { spawn, execFileSync } from 'node:child_process'
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
    <path d="M-12 -22 Q0 -29 12 -22 L9 4 Q0 8 -9 4Z" fill="${color}" stroke="#151821" stroke-width="2"/>
    <circle cy="-35" r="8" fill="#ecd2b5" stroke="#151821" stroke-width="2"/>
  </g>`
}
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
function frame(frames, time, corner) {
  const index = Math.max(1, frames.findIndex(point => point.time >= time))
  const before = frames[index - 1], after = frames[index]
  const blend = Math.min(1, Math.max(0, (time - before.time) / (after.time - before.time)))
  const t = blend * blend * (3 - 2 * blend)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="216" viewBox="0 0 320 192">
  <rect width="320" height="192" fill="#111611"/><path d="M28 112H292L312 177H8Z" fill="#3b4940" stroke="#748479"/>
  <path d="M28 65V118 M292 65V118 M28 70H292 M28 85H292 M28 101H292" stroke="#718075" stroke-width="2" opacity=".7"/>
  ${corner ? '<path d="M77 79V154 M60 79H86 M60 96H86 M60 113H86" stroke="#c4cd97" stroke-width="4"/>' : ''}
  ${wrestler(before.defender, after.defender, t, '#f5a286', -1)}
  ${wrestler(before.attacker, after.attacker, t, '#e1f66c', 1)}
  <rect x="0" y="181" width="320" height="11" fill="#111611"/>
  <text x="160" y="189" text-anchor="middle" fill="#f1f3e8" font-size="8" font-family="sans-serif">${esc(after.caption || before.caption)}</text>
  </svg>`
}

const out = new URL('../public/moves/', import.meta.url)
mkdirSync(out, { recursive: true })
const directory = mkdtempSync(join(tmpdir(), 'wl-move-video-'))
try {
  for (const [id, frames] of Object.entries(demos)) {
    if (process.argv.length > 2 && !process.argv.includes(id)) continue
    const count = Math.ceil(frames.at(-1).time * 15) + 1
    for (let index = 0; index < count; index++) {
      const svg = join(directory, 'frame.svg')
      const png = join(directory, String(index).padStart(3, '0') + '.png')
      writeFileSync(svg, frame(frames, Math.min(index / 15, frames.at(-1).time), ['crossbody','moonsault','elbow','splash'].includes(id)))
      execFileSync('inkscape', [svg, '--export-type=png', '--export-filename=' + png], { stdio: 'ignore' })
    }
    const target = new URL(id + '.mp4', out)
    execFileSync('ffmpeg', ['-y','-loglevel','error','-framerate','15','-i',join(directory,'%03d.png'),'-frames:v',String(count),
      '-c:v','libx264','-profile:v','baseline','-pix_fmt','yuv420p','-crf','29','-movflags','+faststart',target.pathname], { stdio: 'inherit' })
    process.stdout.write(id + '\n')
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
