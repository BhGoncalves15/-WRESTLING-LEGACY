import { ArrowRight, Crosshair, Flame, HeartPulse, Repeat2, Shield, Swords, Trophy, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ORGANIZATIONS, ROSTER_BY_ID, TITLES_BY_ID, type Fighter } from '../content/catalog'
import { MOVE_BY_ID } from '../content/moves'
import { roundName, tournamentEdition } from '../content/tournaments'
import {
  MATCH_FORMAT_LABEL, METHOD_LABEL, MOVE_KINDS, MOVE_KIND_LABEL, overall, type Actor, type Bout, type BoutSide,
  type Career, type DuelBout, type MatchFormat, type Method, type MoveKind, type MultiBout, type Show, type TagBout,
} from '../domain/model'
import { actionDescription, actionName, positionName, reasonUnavailable, TACTICAL_ACTIONS, telegraph } from '../engine/combat'
import { PLAYER_ID, fighterName, nextCareerShow, playerFor } from '../engine/career'
import { formatForSize, multiFormatForSize } from '../engine/matches'
import { BREAKUP_STAMINA, multiActionIssue } from '../engine/multi-combat'
import { matchRivalry, rivalryStates } from '../engine/rivalries'
import { TAG_ACTIONS, benchSlots, cornerFighterIds, cornerSide, isTagBout, legalFighterId, tagActionFor, tagActionUnavailable, tagTarget } from '../engine/tag-combat'
import { EmptyState, Meter, PageTitle } from './shared'

function Corner({ fighter, side, rival = false, tag = false, selected = false, children }: {
  fighter: Fighter; side: BoutSide; rival?: boolean; tag?: boolean; selected?: boolean; children?: ReactNode
}) {
  return <section className={'panel ring-corner' + (rival ? ' rival-corner' : '') + (selected ? ' targeted-corner' : '')}>
    <header className="corner-header">
      <div className="fighter-avatar">{fighter.name.slice(0, 2).toUpperCase()}</div>
      <div><h2>{fighter.name}</h2><p>{fighter.style} · {fighter.alignment}</p></div>
      <div className="rating"><strong>{overall(fighter.attributes, fighter.style)}</strong><span>OVR</span></div>
    </header>
    <p className="position-chip">{tag && <strong>No ringue · </strong>}{positionName(side.position)}</p>
    <Meter label="Condição" value={side.condition} variant="health" />
    <Meter label="Stamina" value={side.stamina} variant="stamina" />
    <Meter label="Momentum" value={side.momentum} variant="momentum" />
    {children}
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

type FightProps = {
  career: Career; pending: boolean; onTurn: (id: string) => void; onTarget: (id: string) => void;
  onAdvance: () => void; onContracts: () => void
}
type ActiveFightProps = Pick<FightProps, 'career' | 'pending' | 'onTurn' | 'onAdvance'> & { show: Show; player: Fighter }

function FightHeading({ show, bout, format }: { show: Show; bout: Bout; format: MatchFormat }) {
  const belt = bout.titleId ? TITLES_BY_ID.get(bout.titleId) : undefined
  const status = bout.finish ? 'Encerrado' : bout.multi?.pendingFall ? 'Finalização em curso' : 'Turno ' + (bout.turn + 1)
  return <>
    <PageTitle title={show.name} intro={ORGANIZATIONS[show.promotion].name + ' · ' + MATCH_FORMAT_LABEL[format]}
      action={<span className="chip">{status}</span>} />
    {belt && <div className="inline-note"><Trophy size={19} aria-hidden /><span>Disputa pelo {belt.name}</span></div>}
  </>
}

function FightControls({ player, pending, onTurn, issue, title = 'Escolha sua ação', onApron = false, tags = [], children }: {
  player: Fighter; pending: boolean; onTurn: (id: string) => void; issue: (id: string) => string | null;
  title?: string; onApron?: boolean; tags?: { id: string; name?: string }[]; children?: ReactNode
}) {
  const [kind, setKind] = useState<MoveKind>('quick')
  const row = (id: string, move = false, tagName?: string) => {
    const command = tagName ? { ...TAG_ACTIONS.tag, name: tagName }
      : Object.hasOwn(TAG_ACTIONS, id) ? TAG_ACTIONS[id as keyof typeof TAG_ACTIONS] : undefined
    const reason = issue(id)
    return <button type="button" key={id} className={'combat-action ' + (id === 'pin' || id === 'submit' ? 'finish-action' : '')}
      disabled={Boolean(reason) || pending} onClick={() => onTurn(id)}>
      {command ? <Repeat2 size={17} aria-hidden /> : move ? <Swords size={17} aria-hidden /> : id === 'guard' ? <Shield size={17} aria-hidden /> : id === 'breathe' ? <HeartPulse size={17} aria-hidden /> : <Crosshair size={17} aria-hidden />}
      <span><strong>{command?.name ?? actionName(id)}</strong><small>{reason ?? command?.description ?? actionDescription(id)}</small></span>
    </button>
  }
  return <section className="panel fight-control">
    {children}
    <header className="panel-head"><h2><Zap size={19} aria-hidden /> {title}</h2></header>
    {onApron ? <div className="combat-grid">{['ask-tag', 'watch', 'save-partner'].map(id => row(id))}</div> : <>
      <div className="fight-tabs" role="group" aria-label="Categorias de golpe">
        {MOVE_KINDS.map(option => <button key={option} type="button" className={option === kind ? 'selected' : ''} aria-pressed={option === kind}
          onClick={() => setKind(option)}>{MOVE_KIND_LABEL[option]}</button>)}
      </div>
      <div className="combat-grid">{player.moves.filter(id => MOVE_BY_ID.get(id)?.kind === kind).map(id => row(id, true))}</div>
      <h3 className="tactics-title">Táticas</h3>
      <div className="combat-grid">{TACTICAL_ACTIONS.map(id => row(id))}{tags.map(tag => row(tag.id, false, tag.name))}</div>
    </>}
  </section>
}

function FightFinish({ bout, victory, method, pending, onAdvance, children }: {
  bout: Bout; victory: boolean; method: Method; pending: boolean; onAdvance: () => void; children: ReactNode
}) {
  return <section className={'panel fight-finish ' + (victory ? 'won' : '')} aria-live="polite">
    <Trophy size={28} aria-hidden /><div><h2>{victory ? 'Vitória' : 'Derrota'} por {METHOD_LABEL[method].toLowerCase()}</h2>
      <p>{children} após {bout.turn} {bout.turn === 1 ? 'turno' : 'turnos'}. <strong>+{bout.xpAwarded} XP</strong></p></div>
    <button className="button primary" onClick={onAdvance} disabled={pending}>Avançar calendário <ArrowRight size={17} aria-hidden /></button>
  </section>
}

function FightLog({ bout }: { bout: Bout }) {
  return <section className="panel fight-log">
    <header className="panel-head"><h2>Narração</h2></header>
    {bout.log.length ? <ol className="rows" aria-label="Últimas ações da luta">{bout.log.slice(-24).reverse().map((item, index) =>
      <li key={index} className={'log-row log-' + item.actor}><span>{item.turn}</span><p>{item.text}</p></li>)}</ol>
      : <p className="empty-line">Soa o gongo. Escolha seu primeiro movimento.</p>}
  </section>
}

function DuelFight({ career, bout, show, player, pending, onTurn, onAdvance }: ActiveFightProps & { bout: DuelBout }) {
  const edition = bout.tournamentId ? tournamentEdition(bout.tournamentId) : undefined
  const rivalries = useMemo(() => rivalryStates(career.shows), [career.shows])
  const rivalry = !bout.tag ? matchRivalry(rivalries, show, PLAYER_ID, bout.rivalId) : undefined
  const teamBout = isTagBout(bout) ? bout : null
  const playerMembers = cornerFighterIds(bout, 'player', player.id)
  const rivalMembers = cornerFighterIds(bout, 'rival', bout.rivalId)
  const activePlayerId = legalFighterId(bout, 'player', player.id)
  const onApron = activePlayerId !== player.id
  const legalPlayer = onApron ? ROSTER_BY_ID.get(activePlayerId)! : player
  const legalRival = ROSTER_BY_ID.get(legalFighterId(bout, 'rival', bout.rivalId))!
  const finished = bout.finish
  const victory = finished?.winner === 'player'
  const finisher = finished && fighterName(career, legalFighterId(bout, finished.winner, victory ? player.id : bout.rivalId))
  const format = formatForSize(playerMembers.length, teamBout?.tag.mixed)
  const rivalTag = teamBout && tagTarget(teamBout, 'rival', bout.plan) !== undefined
  const tags = teamBout ? benchSlots(teamBout, 'player').map(slot => ({
    id: tagActionFor(teamBout, 'player', slot), name: format === 'trios' ? 'Fazer a tag com ' + fighterName(career, playerMembers[slot]) : undefined,
  })) : []
  return <>
    <FightHeading show={show} bout={bout} format={format} />
    {edition && <div className="inline-note"><Trophy size={19} aria-hidden /><span>
      {edition.name} · {roundName(edition, edition.shows.findIndex(event => event.id === show.id))}
    </span></div>}
    {rivalry?.active && (!rivalry.winnerId || (finished && rivalry.lastMeeting === show.date)) && <div className="inline-note"><Flame size={18} aria-hidden /><span>
      Rivalidade · {fighterName(career, rivalry.fighters[0])} {rivalry.wins[0]}–{rivalry.wins[1]} {fighterName(career, rivalry.fighters[1])}
    </span></div>}
    {teamBout?.tag.mixed && <div className="inline-note"><Repeat2 size={18} aria-hidden /><span>Na tag, as duas duplas trocam o lutador legal.</span></div>}
    <div className="ring-grid">
      <Corner fighter={legalPlayer} side={cornerSide(bout, 'player')} tag={Boolean(teamBout)} />
      <Corner fighter={legalRival} side={cornerSide(bout, 'rival')} tag={Boolean(teamBout)} rival />
    </div>
    {teamBout && <div className="ring-grid apron-grid">
      <Apron career={career} bout={teamBout} actor="player" members={playerMembers} />
      <Apron career={career} bout={teamBout} actor="rival" members={rivalMembers} />
    </div>}
    {finished ? <FightFinish bout={bout} method={finished.method} victory={victory} pending={pending} onAdvance={onAdvance}>
      {finisher} {teamBout ? 'garantiu a vitória da equipe' : 'venceu'}
    </FightFinish> : <FightControls player={player} pending={pending} onTurn={onTurn}
      issue={id => teamBout ? tagActionUnavailable(teamBout, player, id) : reasonUnavailable(bout, 'player', player, id, bout.plan)}
      title={onApron ? 'Ações no apron' : undefined} onApron={onApron} tags={tags}>
      <div className="fight-intent" aria-live="polite"><Flame size={20} aria-hidden /><div><strong>Leitura do rival</strong>
        <p>{legalRival.name} {rivalTag ? 'procura a tag' : telegraph(bout.plan)}.</p></div></div>
    </FightControls>}
    <FightLog bout={bout} />
  </>
}

function MultiFight({ career, bout, show, player, pending, onTurn, onTarget, onAdvance }: ActiveFightProps & Pick<FightProps, 'onTarget'> & { bout: MultiBout }) {
  const { opponents, targetId, pendingFall } = bout.multi
  const { finish } = bout
  const response = useRef<HTMLElement>(null)
  useEffect(() => {
    if (pendingFall) {
      response.current?.focus({ preventScroll: true })
      response.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [pendingFall])
  return <>
    <FightHeading show={show} bout={bout} format={multiFormatForSize(1 + opponents.length)} />
    {pendingFall && <section className="panel fall-reaction" ref={response} tabIndex={-1} aria-labelledby="fall-reaction-title">
      <div><h2 id="fall-reaction-title">Interromper a finalização</h2>
        <p>{fighterName(career, pendingFall.winnerId)} está prestes a vencer por {METHOD_LABEL[pendingFall.method].toLowerCase()}
          {' sobre ' + fighterName(career, pendingFall.defeatedId)}.</p></div>
      <div className="reaction-buttons">
        <button className="button primary" disabled={pending || Boolean(multiActionIssue(bout, player, 'break-up'))}
          onClick={() => onTurn('break-up')}>Interromper · {BREAKUP_STAMINA} de stamina</button>
        <button className="button secondary" disabled={pending} onClick={() => onTurn('allow-fall')}>Deixar a queda seguir</button>
      </div>
    </section>}
    <div className={'ring-grid multi-ring multi-ring-' + (1 + opponents.length)}>
      <Corner fighter={player} side={bout.player} />
      {opponents.map(entry => <Corner key={entry.id} fighter={ROSTER_BY_ID.get(entry.id)!} side={entry.side} rival selected={!finish && targetId === entry.id}>
        {!finish && !pendingFall && <p className="multi-intent">{telegraph(entry.action)}
          {['guard', 'breathe', 'climb'].includes(entry.action) ? '.' : ' · alvo ' + fighterName(career, entry.targetId)}</p>}
      </Corner>)}
    </div>
    {finish ? <FightFinish bout={bout} method={finish.method} victory={finish.winnerId === PLAYER_ID} pending={pending} onAdvance={onAdvance}>
      {fighterName(career, finish.winnerId)} finalizou {fighterName(career, finish.defeatedId)}
    </FightFinish> : !pendingFall && <FightControls player={player} pending={pending} onTurn={onTurn}
      issue={id => multiActionIssue(bout, player, id)}>
      <div className="fight-intent multi-target">
        <Crosshair size={20} aria-hidden /><div><label>Alvo da sua ação
          <select value={targetId} disabled={pending} aria-describedby="multi-fall-rule" onChange={event => onTarget(event.target.value)}>
            {opponents.map(entry => <option value={entry.id} key={entry.id}>{fighterName(career, entry.id)}</option>)}
          </select>
        </label><p id="multi-fall-rule">A primeira queda decide. Para interromper, fique em pé com pelo menos {BREAKUP_STAMINA} de stamina.</p></div>
      </div>
    </FightControls>}
    <FightLog bout={bout} />
  </>
}

export default function Fight({ career, pending, onTurn, onTarget, onAdvance, onContracts }: FightProps) {
  const bout = career.bout
  const show = career.shows.find(item => item.id === bout?.showId)
  const completedBout = bout?.finish ? bout.id : undefined
  useEffect(() => {
    if (completedBout) window.scrollTo(0, 0)
  }, [completedBout])
  if (!bout || !show) return <>
    <PageTitle title="Combates" />
    <EmptyState title="Seu próximo combate" action={<button className="button primary" disabled={pending}
      onClick={career.contract?.status === 'active' ? onAdvance : onContracts}>
      {career.contract?.status === 'active' ? 'Avançar para o show' : 'Ver propostas'} <ArrowRight size={17} aria-hidden />
    </button>}>{nextCareerShow(career) && career.contract?.status === 'active'
      ? 'Avance a agenda para entrar no card de ' + nextCareerShow(career)!.name + '.'
      : 'Assine um contrato para ser escalado para um show.'}</EmptyState>
  </>
  const props = { career, show, pending, player: playerFor(career), onTurn, onAdvance }
  return bout.multi ? <MultiFight {...props} bout={bout} onTarget={onTarget} /> : <DuelFight {...props} bout={bout} />
}
