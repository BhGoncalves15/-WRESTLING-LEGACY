import { ArrowLeft, ArrowRight, Check, ChevronRight, Minus, Plus, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  ALIGNMENTS, ATTRIBUTES, ATTRIBUTE_NAMES, DIFFICULTIES, DIFFICULTY_LABEL, DIVISIONS, DIVISION_LABEL, INITIAL_ATTRIBUTE, INITIAL_BUDGET,
  INITIAL_LIMIT, MOVE_KINDS, MOVE_KIND_LABEL, MOVE_SLOTS, STYLES, clamp, overall, pointsSpent, startingAttributes,
  suggestedAttributes, type Attribute, type Difficulty, type Profile,
} from '../domain/model'
import { defaultMoves, MOVES, MOVE_BY_ID } from '../content/moves'
import { exampleProfile } from '../engine/career'
import { PageTitle } from './shared'

const steps = ['Identidade', 'Atributos', 'Golpes'] as const

function blankProfile(): Profile {
  return {
    name: '', nickname: '', country: 'Brasil', city: '', age: 23, division: 'men', alignment: 'Face',
    style: 'All-Rounder', personality: 'Competitivo', appearance: '', gear: '', entrance: '',
    attributes: startingAttributes(), moves: defaultMoves('All-Rounder'), moveLevels: {},
  }
}

export function Creator({ initialDifficulty, pending, onCancel, onCreate }: {
  initialDifficulty: Difficulty; pending: boolean; onCancel: () => void; onCreate: (profile: Profile, difficulty: Difficulty) => void
}) {
  const [profile, setProfile] = useState<Profile>(blankProfile)
  const [step, setStep] = useState(0)
  const [difficulty, setDifficulty] = useState(initialDifficulty)
  const remaining = INITIAL_BUDGET - pointsSpent(profile.attributes)
  const rating = overall(profile.attributes, profile.style)
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile(current => ({ ...current, [key]: value }))
  }
  function setAttribute(attribute: Attribute, value: number) {
    const limit = Math.min(INITIAL_LIMIT, profile.attributes[attribute] + remaining)
    update('attributes', { ...profile.attributes, [attribute]: clamp(Math.round(value), INITIAL_ATTRIBUTE, limit) })
  }
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 2) onCreate(profile, difficulty)
    else {
      setStep(step + 1)
      window.scrollTo(0, 0)
    }
  }
  function textField(key: 'name' | 'nickname' | 'country' | 'city' | 'personality' | 'appearance' | 'gear' | 'entrance', label: string, required = false) {
    return <label>{label}<input name={key} value={profile[key]} onChange={event => update(key, event.target.value)}
      minLength={required ? 2 : undefined} maxLength={75} required={required} /></label>
  }
  return <>
    <PageTitle title="Crie seu lutador" intro="Carreira Livre · temporada 2026"
      action={<button className="button secondary" onClick={onCancel}><ArrowLeft size={17} aria-hidden /> Voltar</button>} />
    <ol className="steps" aria-label="Etapas da criação">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}
      className={step === index ? 'selected' : index < step ? 'done' : ''}>{index < step && <Check size={14} aria-hidden />}{label}{index < steps.length - 1 && <ChevronRight size={15} aria-hidden />}</li>)}</ol>
    <form className="panel creator" onSubmit={onSubmit}>
      {step === 0 && <>
        <header className="panel-head"><h2>Identidade de ringue</h2><button className="button secondary" type="button" onClick={() => setProfile(exampleProfile())}>
          <Sparkles size={16} aria-hidden /> Usar exemplo BH
        </button></header>
        <div className="form-grid">
          {textField('name', 'Nome de ringue', true)}
          {textField('nickname', 'Apelido')}
          {textField('country', 'País', true)}
          {textField('city', 'Cidade')}
          <label>Idade<input name="age" type="number" min={16} max={80} value={profile.age || ''} required onChange={event => update('age', Number(event.target.value))} /></label>
          <label>Divisão<select value={profile.division} onChange={event => update('division', event.target.value as Profile['division'])}>
            {DIVISIONS.map(division => <option key={division} value={division}>{DIVISION_LABEL[division]}</option>)}</select></label>
          <label>Estilo<select value={profile.style} onChange={event => {
            const style = event.target.value as Profile['style']
            setProfile(current => ({ ...current, style, moves: defaultMoves(style) }))
          }}>{STYLES.map(style => <option key={style}>{style}</option>)}</select></label>
          <label>Alinhamento<select value={profile.alignment} onChange={event => update('alignment', event.target.value as Profile['alignment'])}>
            {ALIGNMENTS.map(alignment => <option key={alignment}>{alignment}</option>)}</select></label>
          {textField('personality', 'Personalidade', true)}
          <label>Dificuldade<select value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty)}>
            {DIFFICULTIES.map(option => <option key={option} value={option}>{DIFFICULTY_LABEL[option]}</option>)}</select></label>
          {textField('appearance', 'Aparência')}
          {textField('gear', 'Traje')}
          {textField('entrance', 'Entrada')}
        </div>
      </>}
      {step === 1 && <>
        <header className="panel-head"><div><h2>Atributos iniciais</h2><p>{remaining} de 180 pontos disponíveis · OVR {rating}</p></div>
          <button type="button" className="button secondary" onClick={() => update('attributes', suggestedAttributes(profile.style))}>
            <Sparkles size={16} aria-hidden /> Distribuir por estilo
          </button></header>
        <div className="attribute-grid">
          {ATTRIBUTES.map(attribute => {
            const value = profile.attributes[attribute]
            return <div className="attribute-input" key={attribute}>
              <label htmlFor={'attr-' + attribute}>{ATTRIBUTE_NAMES[attribute]}</label>
              <div className="stepper">
                <button type="button" aria-label={'Reduzir ' + ATTRIBUTE_NAMES[attribute]} disabled={value <= INITIAL_ATTRIBUTE} onClick={() => setAttribute(attribute, value - 1)}><Minus size={16} /></button>
                <input id={'attr-' + attribute} type="number" inputMode="numeric" value={value} min={40} max={90} onChange={event => setAttribute(attribute, Number(event.target.value))} />
                <button type="button" aria-label={'Aumentar ' + ATTRIBUTE_NAMES[attribute]} disabled={!remaining || value >= INITIAL_LIMIT} onClick={() => setAttribute(attribute, value + 1)}><Plus size={16} /></button>
              </div>
            </div>
          })}
        </div>
      </>}
      {step === 2 && <>
        <header className="panel-head"><div><h2>Moveset</h2><p>Escolha os golpes que estarão disponíveis em combate.</p></div>
          <button type="button" className="button secondary" onClick={() => update('moves', defaultMoves(profile.style))}>Usar golpes do estilo</button></header>
        <div className="moves-grid">
          {MOVE_KINDS.map(kind => <fieldset key={kind}><legend>{MOVE_KIND_LABEL[kind]}</legend>
            {profile.moves.map((id, index) => ({ id, index })).filter(item => MOVE_BY_ID.get(item.id)?.kind === kind).map(({ id, index }, slot) =>
              <label className="move-choice" key={index}><span>{MOVE_KIND_LABEL[kind]} {slot + 1} de {MOVE_SLOTS[kind]}</span>
                <select value={id} onChange={event => update('moves', profile.moves.map((move, target) => target === index ? event.target.value : move))}>
                  {MOVES.filter(move => move.kind === kind && (move.id === id || !profile.moves.includes(move.id))).map(move => <option key={move.id} value={move.id}>{move.name}</option>)}
                </select></label>)}
          </fieldset>)}
        </div>
      </>}
      <div className="form-footer">
        {step > 0 && <button className="button secondary" type="button" onClick={() => { setStep(step - 1); window.scrollTo(0, 0) }}><ArrowLeft size={17} aria-hidden /> Etapa anterior</button>}
        <button className="button primary" type="submit" disabled={pending || (step === 1 && remaining !== 0)}>
          {step === 2 ? 'Criar carreira' : 'Continuar'} <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </form>
  </>
}
