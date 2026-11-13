import { z } from 'zod'

export const LOOK_OPTIONS = {
  face: { oval: 'Oval', square: 'Quadrado', round: 'Redondo', long: 'Alongado' },
  hairType: { straight: 'Liso', wavy: 'Ondulado', curly: 'Cacheado', coily: 'Crespo' },
  haircut: { cropped: 'Raspado', fade: 'Degradê', swept: 'De lado', fringe: 'Franja', tied: 'Preso', loose: 'Solto' },
  hairLength: { short: 'Curto', medium: 'Médio', long: 'Comprido' },
  beard: { none: 'Sem barba', stubble: 'Por fazer', goatee: 'Cavanhaque', full: 'Cheia' },
  moustache: { none: 'Sem bigode', fine: 'Fino', thick: 'Cheio' },
  eyeShape: { almond: 'Amendoado', round: 'Redondo', narrow: 'Estreito' },
  brows: { straight: 'Retas', arched: 'Arqueadas', thick: 'Espessas' },
  build: { lean: 'Longilíneo', athletic: 'Atlético', broad: 'Largo', stocky: 'Compacto' },
  proportions: { balanced: 'Equilibradas', shoulders: 'Ombros largos', longlegs: 'Pernas longas', longarms: 'Braços longos' },
  accessory: { none: 'Sem acessório', glasses: 'Óculos', bandana: 'Bandana', armband: 'Braçadeira', chain: 'Corrente' },
  top: { none: 'Sem camisa', shirt: 'Camiseta', jacket: 'Jaqueta', singlet: 'Singlet' },
  bottom: { tights: 'Calça', trunks: 'Sunga de luta', shorts: 'Shorts', board: 'Bermuda' },
  boots: { short: 'Cano curto', tall: 'Cano alto', laced: 'Com cadarço' },
  pads: { none: 'Sem proteção', knees: 'Joelheiras', elbows: 'Cotoveleiras', both: 'Joelheiras e cotoveleiras' },
  gloves: { none: 'Sem luvas', wrap: 'Bandagens', fingerless: 'Sem dedos', full: 'Fechadas' },
  mask: { none: 'Sem máscara', lucha: 'Lucha libre', half: 'Meia máscara', visor: 'Visor' },
} as const

const options = <T extends Record<string, string>>(values: T) => z.enum(Object.keys(values) as (keyof T & string)[])
const color = z.string().regex(/^#[0-9a-f]{6}$/i)
export const appearanceSchema = z.object({
  skin: color, face: options(LOOK_OPTIONS.face), hairType: options(LOOK_OPTIONS.hairType),
  haircut: options(LOOK_OPTIONS.haircut), hairLength: options(LOOK_OPTIONS.hairLength), hair: color,
  beard: options(LOOK_OPTIONS.beard), moustache: options(LOOK_OPTIONS.moustache), eyes: color,
  eyeShape: options(LOOK_OPTIONS.eyeShape), brows: options(LOOK_OPTIONS.brows),
  heightCm: z.number().int().min(145).max(220), build: options(LOOK_OPTIONS.build),
  proportions: options(LOOK_OPTIONS.proportions), accessory: options(LOOK_OPTIONS.accessory),
  top: options(LOOK_OPTIONS.top), bottom: options(LOOK_OPTIONS.bottom), boots: options(LOOK_OPTIONS.boots),
  pads: options(LOOK_OPTIONS.pads), gloves: options(LOOK_OPTIONS.gloves), mask: options(LOOK_OPTIONS.mask),
  primary: color, accent: color,
})
export type Appearance = z.infer<typeof appearanceSchema>

export function defaultAppearance(): Appearance {
  return {
    skin: '#a86b4d', face: 'oval', hairType: 'wavy', haircut: 'fade', hairLength: 'short', hair: '#252025',
    beard: 'stubble', moustache: 'none', eyes: '#4f713f', eyeShape: 'almond', brows: 'arched',
    heightCm: 178, build: 'athletic', proportions: 'balanced', accessory: 'none',
    top: 'none', bottom: 'tights', boots: 'laced', pads: 'knees', gloves: 'wrap', mask: 'none',
    primary: '#242b38', accent: '#def460',
  }
}
