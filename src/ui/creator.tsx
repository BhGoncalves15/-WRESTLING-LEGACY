import { ArrowLeft, ArrowRight, Check, ChevronRight, Minus, Plus, Sparkles } from 'lucide-react'
import { lazy, Suspense, useId, useState, type FormEvent } from 'react'
import {
  ALIGNMENTS, ATTRIBUTES, ATTRIBUTE_NAMES, DIFFICULTIES, DIFFICULTY_LABEL, DIVISIONS, DIVISION_LABEL, INITIAL_ATTRIBUTE, INITIAL_BUDGET,
  INITIAL_LIMIT, MAX_RING_WEIGHT_KG, MIN_RING_WEIGHT_KG, MAX_STARTING_AGE, MIN_STARTING_AGE, STARTING_AGE_MESSAGE, STYLES, clamp, overall, pointsSpent, startingAttributes,
  suggestedAttributes, validStartingAge, type Attribute, type Difficulty, type Profile,
} from '../domain/model'
import { defaultMoves, swapMove, validMoveset } from '../content/moves'
import { defaultAppearance } from '../domain/appearance'
import { exampleProfile } from '../engine/career'
import { GeographyPicker, openingLocation, selectedPlace, useGeography, type LocationDraft } from './geography-picker'
import { PageTitle } from './shared'

const AppearanceEditor = lazy(() => import('./appearance-editor'))
const Moveset = lazy(() => import('./moveset'))

const steps = ['Identidade', 'Visual', 'Atributos', 'Golpes'] as const

function blankProfile(): Profile {
  return {
    name: '', nickname: '', country: 'Brasil', city: '', age: 23, ringWeightKg: 80, division: 'men', alignment: 'Face',
    style: 'All-Rounder', personality: 'Competitivo', appearance: '', gear: '', entrance: '', look: defaultAppearance(),
    attributes: startingAttributes(), moves: defaultMoves('All-Rounder'), moveLevels: {},
  }
}

export function Creator({ initialDifficulty, pending, onCancel, onCreate }: {
  initialDifficulty: Difficulty; pending: boolean; onCancel: () => void; onCreate: (profile: Profile, difficulty: Difficulty) => void
}) {
  const [profile, setProfile] = useState<Profile>(blankProfile)
  const [step, setStep] = useState(0)
  const [location, setLocation] = useState<LocationDraft>(openingLocation)
  const [error, setError] = useState('')
  const [ageError, setAgeError] = useState(false)
  const fieldId = useId()
  const geography = useGeography(location.countryCode)
  const place = selectedPlace(location, geography.catalog)
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
    setError('')
    if (step === 0 && !validStartingAge(profile.age)) {
      setAgeError(true)
      return
    }
    if (!place || !geography.country) {
      setError('Selecione o país, a divisão administrativa quando disponível e a cidade.')
      return
    }
    if (step === steps.length - 1) {
      onCreate({ ...profile, place, country: geography.country[1], city: place.city }, difficulty)
      return
    }
    setStep(step + 1)
    window.scrollTo(0, 0)
  }
  function textField(key: 'name' | 'nickname' | 'personality', label: string, required = false) {
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
        <header className="panel-head"><h2>Identidade de ringue</h2><button className="button secondary" type="button" onClick={() => {
          setProfile({ ...exampleProfile(), look: defaultAppearance() })
          setLocation({ ...openingLocation(), regionId: 'BR:50', cityId: 'BR:50:5008305' })
          setAgeError(false)
          setError('')
        }}>
          <Sparkles size={16} aria-hidden /> Usar exemplo BH
        </button></header>
        <div className="form-grid">
          {textField('name', 'Nome de ringue', true)}
          {textField('nickname', 'Apelido')}
          <div className="field">
            <label htmlFor={fieldId + '-age'}>Idade inicial</label>
            <input id={fieldId + '-age'} name="age" type="number" inputMode="numeric" min={MIN_STARTING_AGE} max={MAX_STARTING_AGE} step={1}
            value={profile.age || ''} required aria-describedby="starting-age" aria-invalid={ageError || undefined}
            onInvalid={event => { event.preventDefault(); setAgeError(true); event.currentTarget.focus() }}
            onChange={event => { const age = Number(event.target.value); update('age', age); setAgeError(!validStartingAge(age)) }} />
            <small id="starting-age" className={ageError ? 'field-error' : undefined} role={ageError ? 'alert' : undefined}>
              {ageError ? STARTING_AGE_MESSAGE : '18 a 24 anos'}
            </small>
          </div>
          <label>Peso de ringue (kg)<input name="ringWeightKg" type="number" min={MIN_RING_WEIGHT_KG} max={MAX_RING_WEIGHT_KG}
            value={profile.ringWeightKg ?? ''} required onChange={event => update('ringWeightKg', event.target.value === '' ? null : Number(event.target.value))} /></label>
          <div className="field">
            <label htmlFor={fieldId + '-division'}>Divisão</label>
            <select id={fieldId + '-division'} value={profile.division} onChange={event => update('division', event.target.value as Profile['division'])}>
              {DIVISIONS.map(division => <option key={division} value={division}>{DIVISION_LABEL[division]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor={fieldId + '-style'}>Estilo</label>
            <select id={fieldId + '-style'} value={profile.style} onChange={event => {
              const style = event.target.value as Profile['style']
              setProfile(current => ({ ...current, style, moves: defaultMoves(style) }))
            }}>{STYLES.map(style => <option key={style}>{style}</option>)}</select>
          </div>
          <label>Alinhamento<select value={profile.alignment} onChange={event => update('alignment', event.target.value as Profile['alignment'])}>
            {ALIGNMENTS.map(alignment => <option key={alignment}>{alignment}</option>)}</select></label>
          {textField('personality', 'Personalidade', true)}
          <label>Dificuldade<select value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty)}>
            {DIFFICULTIES.map(option => <option key={option} value={option}>{DIFFICULTY_LABEL[option]}</option>)}</select></label>
        </div>
        <GeographyPicker value={location} change={value => { setLocation(value); setError('') }} geography={geography} />
      </>}
      {step === 1 && <>
        <header className="panel-head"><h2>Visual do lutador</h2></header>
        <Suspense fallback={<p className="empty-line" role="status">Carregando o editor 2D…</p>}>
          <AppearanceEditor value={profile.look} onChange={look => update('look', look)} />
        </Suspense>
      </>}
      {step === 2 && <>
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
      {step === 3 && <>
        <header className="panel-head"><h2>Moveset</h2>
          <button type="button" className="button secondary" onClick={() => update('moves', defaultMoves(profile.style))}>Usar golpes do estilo</button></header>
        <Suspense fallback={<p className="empty-line" role="status">Carregando os golpes…</p>}>
          <Moveset profile={profile} onEquip={(id, replaced) => update('moves', replaced
            ? swapMove(profile.moves, id, replaced) : [...profile.moves, id])}
            onRemove={id => update('moves', profile.moves.filter(move => move !== id))} />
        </Suspense>
      </>}
      {error && <p className="empty-line field-error" role="alert">{error}</p>}
      <div className="form-footer">
        {step > 0 && <button className="button secondary" type="button" onClick={() => { setStep(step - 1); window.scrollTo(0, 0) }}><ArrowLeft size={17} aria-hidden /> Etapa anterior</button>}
        <button className="button primary" type="submit" disabled={pending || (step === 0 && !geography.catalog) || (step === 2 && remaining !== 0) || (step === 3 && !validMoveset(profile.moves))}>
          {step === 3 ? 'Criar carreira' : 'Continuar'} <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </form>
  </>
}
