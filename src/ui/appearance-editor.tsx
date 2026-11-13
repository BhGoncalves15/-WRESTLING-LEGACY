import { useState } from 'react'
import { LOOK_OPTIONS, defaultAppearance, type Appearance } from '../domain/appearance'
import { AvatarPreview } from './avatar'

const physical = [
  ['face', 'Formato do rosto'], ['hairType', 'Tipo de cabelo'], ['haircut', 'Corte'], ['hairLength', 'Comprimento'],
  ['beard', 'Barba'], ['moustache', 'Bigode'], ['eyeShape', 'Formato dos olhos'], ['brows', 'Sobrancelhas'],
  ['build', 'Porte físico'], ['proportions', 'Proporções'], ['accessory', 'Acessório'],
] as const
const wardrobe = [
  ['top', 'Parte de cima'], ['bottom', 'Parte de baixo'], ['boots', 'Botas'], ['pads', 'Proteções'],
  ['gloves', 'Luvas'], ['mask', 'Máscara'],
] as const

const skinTones = ['#f6d7c0', '#e5b394', '#ce946e', '#a86b4d', '#86543b', '#613b30', '#482b24', '#30201f']

export default function AppearanceEditor({ value, onChange }: { value?: Appearance; onChange: (value: Appearance) => void }) {
  const look = value ?? defaultAppearance()
  const [back, setBack] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [clothing, setClothing] = useState(false)
  function update<K extends keyof Appearance>(key: K, field: Appearance[K]) {
    onChange({ ...look, [key]: field })
  }
  function options(key: keyof typeof LOOK_OPTIONS, label: string) {
    return <label key={key}>{label}<select value={look[key]} onChange={event => update(key, event.target.value as Appearance[typeof key])}>
      {Object.entries(LOOK_OPTIONS[key]).map(([id, name]) => <option value={id} key={id}>{name}</option>)}
    </select></label>
  }
  function color(key: 'skin' | 'hair' | 'eyes' | 'primary' | 'accent', label: string) {
    return <label>{label}<input type="color" value={look[key]} onChange={event => update(key, event.target.value)} /></label>
  }
  return <div className="appearance-editor">
    <AvatarPreview look={look} back={back} zoom={zoom} controls={<div className="segmented" role="group" aria-label="Visualização do lutador">
      <button type="button" aria-pressed={!back} onClick={() => setBack(false)}>Frente</button>
      <button type="button" aria-pressed={back} onClick={() => setBack(true)}>Costas</button>
      <button type="button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? 'Corpo inteiro' : 'Aproximar'}</button>
    </div>} />
    <div className="appearance-controls">
      <div className="segmented" role="group" aria-label="Editor visual">
        <button type="button" aria-pressed={!clothing} onClick={() => setClothing(false)}>Corpo e rosto</button>
        <button type="button" aria-pressed={clothing} onClick={() => setClothing(true)}>Traje</button>
      </div>
      {clothing ? <div className="appearance-fields">
        {wardrobe.map(([key, label]) => options(key, label))}
        {color('primary', 'Cor principal')}{color('accent', 'Cor de destaque')}
      </div> : <>
        <fieldset className="skin-tones"><legend>Tons de pele</legend>
          {skinTones.map((tone, index) => <button type="button" key={tone} aria-pressed={look.skin === tone}
            aria-label={'Tom de pele ' + (index + 1)} style={{ backgroundColor: tone }} onClick={() => update('skin', tone)} />)}
        </fieldset>
        <div className="appearance-fields">
          {physical.map(([key, label]) => options(key, label))}
          <label>Altura <input type="range" min={145} max={220} value={look.heightCm}
            onChange={event => update('heightCm', Number(event.target.value))} /><output>{look.heightCm} cm</output></label>
          {color('hair', 'Cor do cabelo')}{color('eyes', 'Cor dos olhos')}
        </div>
      </>}
    </div>
  </div>
}
