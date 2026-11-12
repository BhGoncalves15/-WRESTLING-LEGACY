import { ArrowUp, Coins, Flame, Swords, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { OPENING_TITLES, ORGANIZATIONS, TITLES_BY_ID } from '../content/catalog'
import { MOVE_BY_ID } from '../content/moves'
import { supportsTagDefense } from '../content/titles'
import { ATTRIBUTES, ATTRIBUTE_CAP, ATTRIBUTE_NAMES, DIVISION_LABEL, MOVE_KIND_LABEL, overall, type Attribute, type Career } from '../domain/model'
import { attributeCost, balanceFor, fighterName, fighterNames, hasLiveBout, moveCost, PLAYER_ID, recordFor } from '../engine/career'
import { availableTagPartners, tagRecordFor } from '../engine/tag-teams'
import { titleStates } from '../engine/titles'
import { Meter, dateText, money, PageTitle } from './shared'

export function Player({ career, pending, onAttribute, onMove, onPartner }: {
  career: Career; pending: boolean; onAttribute: (attribute: Attribute) => void; onMove: (id: string) => void; onPartner: (id: string | null) => void
}) {
  const [selected, setSelected] = useState('')
  const { profile, contract, xp } = career
  const record = recordFor(career, PLAYER_ID)
  const locked = pending || hasLiveBout(career)
  const states = titleStates(career)
  const belts = [...states].filter(([, state]) => state.holders?.includes(PLAYER_ID))
  const partner = career.tagPartnerId
  const tagRecord = partner ? tagRecordFor(career, partner) : null
  const tagBelts = belts.some(([, state]) => state.holders?.length === 2)
  const tagDivision = OPENING_TITLES.some(title => supportsTagDefense(title) && title.promotion === contract?.promotion && title.division === profile.division)
  const candidates = partner ? [] : availableTagPartners(career, states)
  const choice = candidates.find(fighter => fighter.id === selected)
  return <>
    <PageTitle title="Meu lutador" />
    <section className="panel profile-card">
      <div className="fighter-avatar">{profile.name.slice(0, 2).toUpperCase()}</div>
      <div className="profile-name"><h2>{profile.name}</h2>
        <p>{[profile.nickname, profile.style, profile.alignment, DIVISION_LABEL[profile.division]].filter(Boolean).join(' · ')}</p>
        <p>{[profile.city, profile.country, profile.age + ' anos', profile.personality].filter(Boolean).join(' · ')}</p>
        {(profile.appearance || profile.gear || profile.entrance) && <p>{[profile.appearance, profile.gear, profile.entrance].filter(Boolean).join(' · ')}</p>}
      </div>
      <div className="rating"><strong>{overall(profile.attributes, profile.style)}</strong><span>OVR</span></div>
    </section>
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
          <small>{state.holders?.length === 2 ? fighterNames(career, state.holders) + ' · ' : ''}Desde {dateText(state.heldFrom)}</small></div>
        <span className="chip">{state.defenses} defesas</span>
      </li>)}</ul>
    </section>}
    <section className="panel team-panel">
      <header className="panel-head"><h2><Users size={19} aria-hidden /> Minha dupla</h2>
        {tagRecord && <span className="chip">{tagRecord.wins} V · {tagRecord.losses} D</span>}
      </header>
      {partner ? <div className="team-controls">
        <div className="row-text"><strong>{fighterName(career, partner)}</strong>
          {contract?.status !== 'active' ? <small>A parceria volta aos cards se você assinar com a mesma brand.</small>
            : tagDivision && !tagBelts ? <small>Duas vitórias juntos e popularidade 14 habilitam disputas de cinturão.</small> : null}
          {tagBelts && <small>Encerrar a dupla deixa seus cinturões de duplas vagos.</small>}
        </div>
        <button className="button secondary" disabled={locked} onClick={() => onPartner(null)}>Encerrar dupla</button>
      </div> : candidates.length ? <div className="team-controls">
        <label>Parceiro de dupla<select disabled={locked} value={choice?.id ?? ''} onChange={event => setSelected(event.target.value)}>
          <option value="">Escolher lutador</option>
          {candidates.map(fighter => <option key={fighter.id} value={fighter.id}>{fighter.name} · {fighter.style}</option>)}
        </select></label>
        <button className="button primary" disabled={locked || !choice} onClick={() => choice && onPartner(choice.id)}>Formar dupla</button>
      </div> : <p className="empty-line">{contract?.status === 'active' ? 'Nenhum parceiro de dupla disponível nesta divisão.' : 'Assine um contrato para formar uma dupla.'}</p>}
    </section>
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
