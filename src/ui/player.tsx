import { ArrowUp, Coins, Flame, Swords } from 'lucide-react'
import { ORGANIZATIONS } from '../content/catalog'
import { MOVE_BY_ID } from '../content/moves'
import { ATTRIBUTES, ATTRIBUTE_CAP, ATTRIBUTE_NAMES, DIVISION_LABEL, MOVE_KIND_LABEL, overall, type Attribute, type Career } from '../domain/model'
import { attributeCost, balanceFor, hasLiveBout, moveCost, PLAYER_ID, recordFor } from '../engine/career'
import { Meter, money, PageTitle } from './shared'

export function Player({ career, pending, onAttribute, onMove }: {
  career: Career; pending: boolean; onAttribute: (attribute: Attribute) => void; onMove: (id: string) => void
}) {
  const { profile, contract, xp } = career
  const record = recordFor(career, PLAYER_ID)
  const locked = pending || hasLiveBout(career)
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
