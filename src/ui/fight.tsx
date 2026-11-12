import { ArrowRight, Crosshair, Flame, HeartPulse, Repeat2, Shield, Swords, Trophy, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ORGANIZATIONS, ROSTER_BY_ID, TITLES_BY_ID, type Fighter } from '../content/catalog'
import { MOVE_BY_ID } from '../content/moves'
import { METHOD_LABEL, MOVE_KINDS, MOVE_KIND_LABEL, overall, type BoutSide, type Career, type MoveKind } from '../domain/model'
import { actionDescription, actionName, positionName, reasonUnavailable, TACTICAL_ACTIONS, telegraph } from '../engine/combat'
import { fighterName, nextCareerShow, playerFor } from '../engine/career'
import { TAG_ACTIONS, isTagBout, legalFighterId, tagActionUnavailable } from '../engine/tag-combat'
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

function Apron({ fighter, side, usedSave }: { fighter: Fighter; side: BoutSide; usedSave: boolean }) {
  return <div className="panel apron-card">
    <div className="row-text"><small>No apron</small><strong>{fighter.name}</strong>
      <small>{Math.round(side.condition)}% condição · {Math.round(side.stamina)}% stamina</small>
      <small>{usedSave ? 'Salvamento usado' : 'Salvamento disponível'}</small>
    </div>
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
  const tag = isTagBout(bout) ? bout.tag : null
  const partner = tag && ROSTER_BY_ID.get(tag.player.partnerId)
  const rivalPartner = tag && ROSTER_BY_ID.get(tag.rival.partnerId)
  const onApron = tag?.player.partnerLegal ?? false
  const rivalOnApron = tag?.rival.partnerLegal ?? false
  const legalPlayer = onApron && partner ? partner : player
  const legalRival = rivalOnApron && rivalPartner ? rivalPartner : rival
  const finished = bout.finish
  const victory = finished?.winner === 'player'
  const finisher = finished && fighterName(career, legalFighterId(bout, finished.winner, victory ? player.id : rival.id))
  const actions = player.moves.filter(id => MOVE_BY_ID.get(id)?.kind === kind)
  const row = (id: string, move = false) => {
    const command = Object.hasOwn(TAG_ACTIONS, id) ? TAG_ACTIONS[id as keyof typeof TAG_ACTIONS] : undefined
    const reason = isTagBout(bout) ? tagActionUnavailable(bout, player, id) : reasonUnavailable(bout, 'player', player, id, bout.plan)
    return <button type="button" key={id} className={'combat-action ' + (id === 'pin' || id === 'submit' ? 'finish-action' : '')}
      disabled={Boolean(reason) || pending} onClick={() => onTurn(id)}>
      {command ? <Repeat2 size={17} aria-hidden /> : move ? <Swords size={17} aria-hidden /> : id === 'guard' ? <Shield size={17} aria-hidden /> : id === 'breathe' ? <HeartPulse size={17} aria-hidden /> : <Crosshair size={17} aria-hidden />}
      <span><strong>{command?.name ?? actionName(id)}</strong><small>{reason ?? command?.description ?? actionDescription(id)}</small></span>
    </button>
  }
  const format = tag ? 'Tag Team' : 'Singles'
  return <>
    <PageTitle title={show.name} intro={ORGANIZATIONS[show.promotion].name + ' · ' + format}
      action={<span className="chip">{finished ? 'Encerrado' : 'Turno ' + (bout.turn + 1)}</span>} />
    {belt && <div className="inline-note"><Trophy size={19} aria-hidden /><span>Disputa pelo {belt.name}</span></div>}
    <div className="ring-grid">
      <Corner fighter={legalPlayer} side={onApron && tag ? tag.player.partner : bout.player} tag={Boolean(tag)} />
      <Corner fighter={legalRival} side={rivalOnApron && tag ? tag.rival.partner : bout.rival} tag={Boolean(tag)} rival />
    </div>
    {tag && partner && rivalPartner && <div className="ring-grid apron-grid">
      <Apron fighter={onApron ? player : partner} side={onApron ? bout.player : tag.player.partner} usedSave={tag.player.saveUsed} />
      <Apron fighter={rivalOnApron ? rival : rivalPartner} side={rivalOnApron ? bout.rival : tag.rival.partner} usedSave={tag.rival.saveUsed} />
    </div>}
    {finished ? <section className={'panel fight-finish ' + (victory ? 'won' : '')} aria-live="polite">
      <Trophy size={28} aria-hidden /><div><h2>{victory ? 'Vitória' : 'Derrota'} por {METHOD_LABEL[finished.method].toLowerCase()}</h2>
        <p>{finisher} {tag ? 'garantiu a vitória da dupla' : 'venceu'} após {bout.turn} {bout.turn === 1 ? 'turno' : 'turnos'}. <strong>+{bout.xpAwarded} XP</strong></p></div>
      <button className="button primary" onClick={onAdvance} disabled={pending}>Avançar calendário <ArrowRight size={17} aria-hidden /></button>
    </section> : <section className="panel fight-control">
      <div className="fight-intent" aria-live="polite"><Flame size={20} aria-hidden /><div><strong>Leitura do rival</strong>
        <p>{legalRival.name} {bout.plan === 'tag' ? 'procura a tag' : telegraph(bout.plan)}.</p></div></div>
      <header className="panel-head"><h2><Zap size={19} aria-hidden /> {onApron ? 'Ações no apron' : 'Escolha sua ação'}</h2></header>
      {onApron ? <div className="combat-grid">{['ask-tag', 'watch', 'save-partner'].map(id => row(id))}</div> : <>
        <div className="fight-tabs" role="group" aria-label="Categorias de golpe">
          {MOVE_KINDS.map(option => <button key={option} type="button" className={option === kind ? 'selected' : ''} aria-pressed={option === kind}
            onClick={() => setKind(option)}>{MOVE_KIND_LABEL[option]}</button>)}
        </div>
        <div className="combat-grid">{actions.map(id => row(id, true))}</div>
        <h3 className="tactics-title">Táticas</h3>
        <div className="combat-grid">{TACTICAL_ACTIONS.map(id => row(id))}{tag && row('tag')}</div>
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
