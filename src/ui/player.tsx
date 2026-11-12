import { ArrowUp, Coins, Flame, Swords, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { OPENING_TITLES, ORGANIZATIONS, TITLES_BY_ID } from '../content/catalog'
import { MOVE_BY_ID } from '../content/moves'
import { NJPW_JUNIOR_IDS, TAMASHII_IDS } from '../content/roster-njpw'
import { JUNIOR_WEIGHT_LIMIT, defenseFormat } from '../content/titles'
import { ATTRIBUTES, ATTRIBUTE_CAP, ATTRIBUTE_NAMES, DIVISION_LABEL, MATCH_FORMAT_LABEL, MATCH_FORMATS, MAX_RING_WEIGHT_KG, MIN_RING_WEIGHT_KG, MOVE_KIND_LABEL, TEAM_SIZE,
  overall, type Attribute, type Career, type MatchFormat, type TeamFormat } from '../domain/model'
import { attributeCost, balanceFor, fighterNames, hasLiveBout, moveCost, PLAYER_ID, recordFor } from '../engine/career'
import { availableTeamPartners, careerTeamPartners, teamRecordFor } from '../engine/tag-teams'
import { titleStates, type BeltStates } from '../engine/titles'
import { Meter, dateText, money, PageTitle } from './shared'

function TeamPanel({ career, format, locked, states, onTeam }: {
  career: Career; format: TeamFormat; locked: boolean; states: BeltStates; onTeam: (ids: string[] | null) => void
}) {
  const [selected, setSelected] = useState(['', ''])
  const size = TEAM_SIZE[format]
  const { name, labels, teamName } = {
    tag: { name: 'Minha dupla', labels: ['Parceiro de dupla'], teamName: 'dupla' },
    trios: { name: 'Meu trio', labels: ['Primeiro parceiro do trio', 'Segundo parceiro do trio'], teamName: 'trio' },
    mixed: { name: 'Minha dupla mista', labels: ['Parceiro da dupla mista'], teamName: 'dupla mista' },
  }[format]
  const partners = careerTeamPartners(career, format)
  const record = partners.length ? teamRecordFor(career, partners) : null
  const champion = [...states].some(([id, state]) => state.holders?.includes(PLAYER_ID) && defenseFormat(TITLES_BY_ID.get(id)!) === format)
  const titleDivision = OPENING_TITLES.some(title => defenseFormat(title) === format && title.promotion === career.contract?.promotion
    && (title.division === career.profile.division || title.division === 'mixed'))
  const candidates = record ? [] : availableTeamPartners(career, format, states)
  const choices = labels.map((_, index) => candidates.some(fighter => fighter.id === selected[index]) ? selected[index] : '')
  const ready = choices.every(Boolean) && new Set(choices).size === choices.length
  return <section className="panel team-panel" aria-label={name}>
    <header className="panel-head"><h2><Users size={19} aria-hidden /> {name}</h2>
      {record && <span className="chip">{record.wins} V · {record.losses} D</span>}
    </header>
    {record ? <div className="team-controls">
      <div className="row-text"><strong>{fighterNames(career, partners)}</strong>
        {career.contract?.status !== 'active' ? <small>A equipe volta aos cards se você assinar com a mesma brand.</small>
          : titleDivision && !champion ? <small>Duas vitórias juntos e popularidade 14 habilitam disputas de cinturão.</small> : null}
        {champion && <small>Encerrar esta formação deixa vagos os cinturões conquistados por ela.</small>}
      </div>
      <button className="button secondary" disabled={locked} onClick={() => onTeam(null)}>Encerrar {teamName}</button>
    </div> : candidates.length >= size - 1 ? <div className="team-controls">
      {labels.map((label, index) => <label key={label}>{label}
        <select disabled={locked} value={choices[index]} onChange={event => {
          const id = event.target.value
          setSelected(previous => previous.map((value, slot) => slot === index ? id : value))
        }}>
          <option value="">Escolher lutador</option>
          {candidates.filter(fighter => !choices.some((id, slot) => slot !== index && id === fighter.id))
            .map(fighter => <option key={fighter.id} value={fighter.id}>{fighter.name} · {fighter.style}
              {NJPW_JUNIOR_IDS.has(fighter.id) ? ' · Junior' : ''}{TAMASHII_IDS.has(fighter.id) ? ' · TAMASHII' : ''}</option>)}
        </select>
      </label>)}
      <button className="button primary" disabled={locked || !ready} onClick={() => onTeam(choices)}>Formar {teamName}</button>
    </div> : <p className="empty-line">{career.contract?.status === 'active' ? 'O elenco da sua divisão não tem parceiros disponíveis para esta formação.'
      : 'Assine um contrato para formar uma equipe.'}</p>}
  </section>
}

export function Player({ career, pending, onAttribute, onMove, onTeam, onFormat, onWeight }: {
  career: Career; pending: boolean; onAttribute: (attribute: Attribute) => void; onMove: (id: string) => void
  onTeam: (format: TeamFormat, ids: string[] | null) => void; onFormat: (format: MatchFormat) => void
  onWeight: (weight: number) => void
}) {
  const [weight, setWeight] = useState('')
  const { profile, contract, xp } = career
  const record = recordFor(career, PLAYER_ID)
  const locked = pending || hasLiveBout(career)
  const states = titleStates(career)
  const belts = [...states].filter(([, state]) => state.holders?.includes(PLAYER_ID))
  const formats = MATCH_FORMATS.filter(format => format === 'singles' || careerTeamPartners(career, format).length > 0)
  return <>
    <PageTitle title="Meu lutador" />
    <section className="panel profile-card">
      <div className="fighter-avatar">{profile.name.slice(0, 2).toUpperCase()}</div>
      <div className="profile-name"><h2>{profile.name}</h2>
        <p>{[profile.nickname, profile.style, profile.alignment, DIVISION_LABEL[profile.division]].filter(Boolean).join(' · ')}</p>
        <p>{[profile.city, profile.country, profile.age + ' anos', profile.ringWeightKg && profile.ringWeightKg + ' kg', profile.personality].filter(Boolean).join(' · ')}</p>
        {(profile.appearance || profile.gear || profile.entrance) && <p>{[profile.appearance, profile.gear, profile.entrance].filter(Boolean).join(' · ')}</p>}
      </div>
      <div className="rating"><strong>{overall(profile.attributes, profile.style)}</strong><span>OVR</span></div>
    </section>
    {profile.ringWeightKg === null && <form className="panel team-preference" onSubmit={event => {
      event.preventDefault()
      onWeight(Number(weight))
    }}>
      <label>Peso de ringue (kg)
        <input type="number" required min={MIN_RING_WEIGHT_KG} max={MAX_RING_WEIGHT_KG} value={weight}
          onChange={event => setWeight(event.target.value)} />
      </label>
      <button className="button secondary" disabled={pending}>Registrar peso</button>
      <small>Até {JUNIOR_WEIGHT_LIMIT} kg dá acesso às disputas Junior da NJPW na divisão masculina.</small>
    </form>}
    <div className="stats-grid">
      <div className="panel stat"><Swords aria-hidden /><span>Cartel</span><strong>{record.wins} V · {record.losses} D</strong></div>
      <div className="panel stat"><Flame aria-hidden /><span>XP disponível</span><strong>{xp}</strong></div>
      <div className="panel stat"><Coins aria-hidden /><span>Patrimônio</span><strong>{money(balanceFor(career))}</strong></div>
      <div className="panel stat"><ArrowUp aria-hidden /><span>Popularidade</span><strong>{career.popularity}<small> / 100</small></strong></div>
    </div>
    {belts.length > 0 && <section className="panel career-belts">
      <header className="panel-head"><h2><Trophy size={19} aria-hidden /> Cinturões em posse</h2></header>
      <ul className="rows">{belts.map(([id, state]) => <li className="record-row" key={id}>
        <div className="row-text"><strong>{TITLES_BY_ID.get(id)?.name}</strong>
          <small>{state.holders && state.holders.length > 1 ? fighterNames(career, state.holders) + ' · ' : ''}Desde {dateText(state.heldFrom)}</small></div>
        <span className="chip">{state.defenses} defesas</span>
      </li>)}</ul>
    </section>}
    {formats.length > 1 && <div className="panel team-preference">
      <label>Formato preferido nos cards
        <select disabled={pending} value={career.preferredFormat} onChange={event => onFormat(event.target.value as MatchFormat)}>
          {formats.map(format => <option key={format} value={format}>{MATCH_FORMAT_LABEL[format]}</option>)}
        </select>
      </label>
      <small>Defesas de título têm prioridade.</small>
    </div>}
    <TeamPanel career={career} format="tag" locked={locked} states={states} onTeam={ids => onTeam('tag', ids)} />
    <TeamPanel career={career} format="trios" locked={locked} states={states} onTeam={ids => onTeam('trios', ids)} />
    {contract?.promotion === 'aaa' && <TeamPanel career={career} format="mixed" locked={locked} states={states} onTeam={ids => onTeam('mixed', ids)} />}
    <div className="two-col profile-details">
      <section className="panel">
        <header className="panel-head"><div><h2>Atributos</h2><p>{contract?.status === 'active' ? ORGANIZATIONS[contract.promotion].name : 'Livre no mercado'}</p></div><span className="chip">{xp} XP</span></header>
        <ul className="rows">
          {ATTRIBUTES.map(attribute => {
            const value = profile.attributes[attribute]
            const cost = attributeCost(value)
            return <li className="progress-row" key={attribute}><Meter label={ATTRIBUTE_NAMES[attribute]} value={value} />
              <button className="button secondary small-button" disabled={locked || value >= ATTRIBUTE_CAP || xp < cost} onClick={() => onAttribute(attribute)}
                aria-label={'Melhorar ' + ATTRIBUTE_NAMES[attribute] + ' por ' + cost + ' XP'}>{value === ATTRIBUTE_CAP ? 'Máximo' : '+1 · ' + cost + ' XP'}</button>
            </li>
          })}
        </ul>
      </section>
      <section className="panel">
        <header className="panel-head"><div><h2>Golpes</h2><p>Mais impacto e menor custo de stamina por nível.</p></div></header>
        <ul className="rows">
          {profile.moves.map(id => {
            const move = MOVE_BY_ID.get(id)!
            const level = profile.moveLevels[id] ?? 0
            const cost = moveCost(level)
            return <li className="progress-row" key={id}>
              <div className="row-text"><strong>{move.name}</strong><small>{MOVE_KIND_LABEL[move.kind]} · nível {level}/3</small></div>
              <button className="button secondary small-button" disabled={locked || level >= 3 || xp < cost} onClick={() => onMove(id)}
                aria-label={'Melhorar ' + move.name + ' por ' + cost + ' XP'}>{level >= 3 ? 'Máximo' : '+1 · ' + cost + ' XP'}</button>
            </li>
          })}
        </ul>
      </section>
    </div>
  </>
}
