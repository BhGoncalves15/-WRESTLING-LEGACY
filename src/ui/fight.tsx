import { ArrowRight, Crosshair, Flame, HeartPulse, Repeat2, Shield, Swords, Trophy, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ORGANIZATIONS, ROSTER_BY_ID, TITLES_BY_ID, type Fighter } from '../content/catalog'
import { MOVE_BY_ID } from '../content/moves'
import { MATCH_FORMAT_LABEL, METHOD_LABEL, MOVE_KINDS, MOVE_KIND_LABEL, overall, type Actor, type BoutSide, type Career, type MoveKind, type TagBout } from '../domain/model'
import { actionDescription, actionName, positionName, reasonUnavailable, TACTICAL_ACTIONS, telegraph } from '../engine/combat'
import { fighterName, nextCareerShow, playerFor } from '../engine/career'
import { formatForSize } from '../engine/matches'
import { TAG_ACTIONS, benchSlots, cornerFighterIds, cornerSide, isTagBout, legalFighterId, tagActionFor, tagActionUnavailable, tagTarget } from '../engine/tag-combat'
import { EmptyState, Meter, PageTitle } from './shared'

function Corner({ fighter, side, rival = false, tag = false }: { fighter: Fighter; side: BoutSide; rival?: boolean; tag?: boolean }) {
  return <section className={'panel ring-corner ' + (rival ? 'rival-corner' : '')}>
    <header className="corner-header">
      <div className="fighter-avatar">{fighter.name.slice(0, 2).toUpperCase()}</div>
      <div><h2>{fighter.name}</h2><p>{fighter.style} · {fighter.alignment}</p></div>
      <div className="rating"><strong>{overall(fighter.attributes, fighter.style)}</strong><span>OVR</span></div>
    </header>
    <p className="position-chip">{tag && <strong>No ringue · </strong>}{positionName(side.position)}</p>
    <Meter label="Condição" value={side.condition} variant="health" />
    <Meter label="Stamina" value={side.stamina} variant="stamina" />
    <Meter label="Momentum" value={side.momentum} variant="momentum" />
  </section>
}

function Apron({ career, bout, actor, members }: { career: Career; bout: TagBout; actor: Actor; members: string[] }) {
  return <div className="panel apron-card">
    <small>No apron</small>
    <ul className="apron-members">{benchSlots(bout, actor).map(slot => {
      const side = cornerSide(bout, actor, slot)
      return <li className="row-text" key={members[slot]}>
        <strong>{fighterName(career, members[slot])}</strong>
        <small>{Math.round(side.condition)}% condição · {Math.round(side.stamina)}% stamina</small>
      </li>
    })}</ul>
    <small>{bout.tag[actor].saveUsed ? 'Salvamento usado' : 'Salvamento disponível'}</small>
  </div>
}

export function Fight({ career, pending, onTurn, onAdvance, onContracts }: {
  career: Career; pending: boolean; onTurn: (id: string) => void; onAdvance: () => void; onContracts: () => void
}) {
  const [kind, setKind] = useState<MoveKind>('quick')
  const bout = career.bout
  const rival = bout ? ROSTER_BY_ID.get(bout.rivalId) : undefined
  const show = career.shows.find(item => item.id === bout?.showId)
  const player = playerFor(career)
  const completedBout = bout?.finish ? bout.id : undefined
  useEffect(() => {
    if (completedBout) window.scrollTo(0, 0)
  }, [completedBout])
  if (!bout || !rival || !show) return <>
    <PageTitle title="Combates" />
    <EmptyState title="Seu próximo combate" action={<button className="button primary" disabled={pending}
      onClick={career.contract?.status === 'active' ? onAdvance : onContracts}>
      {career.contract?.status === 'active' ? 'Avançar para o show' : 'Ver propostas'} <ArrowRight size={17} aria-hidden />
    </button>}>{nextCareerShow(career) && career.contract?.status === 'active'
      ? 'Avance a agenda para entrar no card de ' + nextCareerShow(career)!.name + '.'
      : 'Assine um contrato para ser escalado para um show.'}</EmptyState>
  </>

  const belt = bout.titleId ? TITLES_BY_ID.get(bout.titleId) : undefined
  const teamBout = isTagBout(bout) ? bout : null
  const playerMembers = cornerFighterIds(bout, 'player', player.id)
  const rivalMembers = cornerFighterIds(bout, 'rival', rival.id)
  const activePlayerId = legalFighterId(bout, 'player', player.id)
  const onApron = activePlayerId !== player.id
  const legalPlayer = onApron ? ROSTER_BY_ID.get(activePlayerId)! : player
  const legalRival = ROSTER_BY_ID.get(legalFighterId(bout, 'rival', rival.id))!
  const finished = bout.finish
  const victory = finished?.winner === 'player'
  const finisher = finished && fighterName(career, legalFighterId(bout, finished.winner, victory ? player.id : rival.id))
  const actions = player.moves.filter(id => MOVE_BY_ID.get(id)?.kind === kind)
  const row = (id: string, move = false, tagName?: string) => {
    const command = tagName ? { ...TAG_ACTIONS.tag, name: tagName }
      : Object.hasOwn(TAG_ACTIONS, id) ? TAG_ACTIONS[id as keyof typeof TAG_ACTIONS] : undefined
    const reason = teamBout ? tagActionUnavailable(teamBout, player, id) : reasonUnavailable(bout, 'player', player, id, bout.plan)
    return <button type="button" key={id} className={'combat-action ' + (id === 'pin' || id === 'submit' ? 'finish-action' : '')}
      disabled={Boolean(reason) || pending} onClick={() => onTurn(id)}>
      {command ? <Repeat2 size={17} aria-hidden /> : move ? <Swords size={17} aria-hidden /> : id === 'guard' ? <Shield size={17} aria-hidden /> : id === 'breathe' ? <HeartPulse size={17} aria-hidden /> : <Crosshair size={17} aria-hidden />}
      <span><strong>{command?.name ?? actionName(id)}</strong><small>{reason ?? command?.description ?? actionDescription(id)}</small></span>
    </button>
  }
  const format = formatForSize(playerMembers.length, teamBout?.tag.mixed)
  const rivalTag = teamBout && tagTarget(teamBout, 'rival', bout.plan) !== undefined
  return <>
    <PageTitle title={show.name} intro={ORGANIZATIONS[show.promotion].name + ' · ' + MATCH_FORMAT_LABEL[format]}
      action={<span className="chip">{finished ? 'Encerrado' : 'Turno ' + (bout.turn + 1)}</span>} />
    {belt && <div className="inline-note"><Trophy size={19} aria-hidden /><span>Disputa pelo {belt.name}</span></div>}
    {teamBout?.tag.mixed && <div className="inline-note"><Repeat2 size={18} aria-hidden /><span>Na tag, as duas duplas trocam o lutador legal.</span></div>}
    <div className="ring-grid">
      <Corner fighter={legalPlayer} side={cornerSide(bout, 'player')} tag={Boolean(teamBout)} />
      <Corner fighter={legalRival} side={cornerSide(bout, 'rival')} tag={Boolean(teamBout)} rival />
    </div>
    {teamBout && <div className="ring-grid apron-grid">
      <Apron career={career} bout={teamBout} actor="player" members={playerMembers} />
      <Apron career={career} bout={teamBout} actor="rival" members={rivalMembers} />
    </div>}
    {finished ? <section className={'panel fight-finish ' + (victory ? 'won' : '')} aria-live="polite">
      <Trophy size={28} aria-hidden /><div><h2>{victory ? 'Vitória' : 'Derrota'} por {METHOD_LABEL[finished.method].toLowerCase()}</h2>
        <p>{finisher} {teamBout ? 'garantiu a vitória da equipe' : 'venceu'} após {bout.turn} {bout.turn === 1 ? 'turno' : 'turnos'}. <strong>+{bout.xpAwarded} XP</strong></p></div>
      <button className="button primary" onClick={onAdvance} disabled={pending}>Avançar calendário <ArrowRight size={17} aria-hidden /></button>
    </section> : <section className="panel fight-control">
      <div className="fight-intent" aria-live="polite"><Flame size={20} aria-hidden /><div><strong>Leitura do rival</strong>
        <p>{legalRival.name} {rivalTag ? 'procura a tag' : telegraph(bout.plan)}.</p></div></div>
      <header className="panel-head"><h2><Zap size={19} aria-hidden /> {onApron ? 'Ações no apron' : 'Escolha sua ação'}</h2></header>
      {onApron ? <div className="combat-grid">{['ask-tag', 'watch', 'save-partner'].map(id => row(id))}</div> : <>
        <div className="fight-tabs" role="group" aria-label="Categorias de golpe">
          {MOVE_KINDS.map(option => <button key={option} type="button" className={option === kind ? 'selected' : ''} aria-pressed={option === kind}
            onClick={() => setKind(option)}>{MOVE_KIND_LABEL[option]}</button>)}
        </div>
        <div className="combat-grid">{actions.map(id => row(id, true))}</div>
        <h3 className="tactics-title">Táticas</h3>
        <div className="combat-grid">{TACTICAL_ACTIONS.map(id => row(id))}
          {teamBout && benchSlots(teamBout, 'player').map(slot => row(tagActionFor(teamBout, 'player', slot), false,
            format === 'trios' ? 'Fazer a tag com ' + fighterName(career, playerMembers[slot]) : undefined))}
        </div>
      </>}
    </section>}
    <section className="panel fight-log">
      <header className="panel-head"><h2>Narração</h2></header>
      {bout.log.length ? <ol className="rows" aria-label="Últimas ações da luta">{[...bout.log].reverse().slice(0, 24).map((item, index) =>
        <li key={index} className={'log-row log-' + item.actor}><span>{item.turn}</span><p>{item.text}</p></li>)}</ol>
        : <p className="empty-line">Soa o gongo. Escolha seu primeiro movimento.</p>}
    </section>
  </>
}
