import { ChevronDown, Trophy } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { ORGANIZATIONS, OPENING_TITLES, TITLES_BY_ID } from '../content/catalog'
import { titleName, titlePrestige } from '../content/belt-designs'
import type { BeltEdition } from '../content/belt-catalog'
import { beltPhotoOn, realBeltDesigns } from '../content/belt-photos'
import { defenseFormat, JUNIOR_WEIGHT_LIMIT, type TitleRecord, type TitleRule } from '../content/titles'
import { searchKey } from '../domain/geography'
import { DIVISION_LABEL, METHOD_LABEL, type Career, type TitlePair } from '../domain/model'
import { fighterNames, hasLiveBout, PLAYER_ID } from '../engine/career'
import { unificationStats } from '../engine/title-office'
import { sameTeam } from '../engine/matches'
import { canUnify, titleStates, type BeltState, type BeltStates } from '../engine/titles'
import { BeltAttribution, BeltVisual, useBeltVisual } from './belt-art'
import { LocalBeltPhotoControls } from './belt-photo-library'
import { CircuitSelect, type CircuitFilter } from './world-filter'
import { dateText, OrgMark, PageTitle, SourceLink } from './shared'

const ruleLabel: Record<TitleRule, string> = {
  singles: 'Individual', junior: 'Peso júnior', cruiser: 'Peso cruzeiro', pure: 'Pure Rules', television: 'Luta com tempo regulamentado',
  rookies: 'Rookies', tag: 'Duplas', trios: 'Trios', maremoto: 'Maremoto',
}

type Design = { id: string; label: string; from?: string; until?: string; edition: BeltEdition }

function visualHistory(title: TitleRecord, career: Career | null, state: BeltState | undefined): Design[] {
  const currentPhoto = beltPhotoOn(title, career?.date)
  const changes = state?.designs ?? []
  const photographs = realBeltDesigns(title).filter(photo => photo !== currentPhoto).map(photo => ({
    id: photo.id, label: 'Fotografia · edição de ' + photo.from.slice(0, 4), from: photo.from, until: photo.until, edition: { photo },
  }))
  return [...photographs, {
    id: currentPhoto?.id ?? title.id + '-opening', label: title.origin === 'fictional' ? 'Edição original fictícia' : 'Edição de referência em 2026',
    from: currentPhoto?.from, until: changes[0]?.date ?? state?.retiredOn ?? currentPhoto?.until, edition: { photo: currentPhoto },
  }, ...changes.map((change, index) => ({
    id: change.showId, label: change.kind === 'unification' ? 'Unificação' : change.kind === 'personalized' ? 'Homenagem ao campeão' : 'Reformulação',
    from: change.date, until: changes[index + 1]?.date ?? state?.retiredOn, edition: { change },
  }))]
}

function BeltCard({ title, career, state, eager }: { title: TitleRecord; career: Career | null; state?: BeltState; eager: boolean }) {
  const [version, setVersion] = useState('')
  const [expanded, setExpanded] = useState(false)
  const designs = visualHistory(title, career, state)
  const latest = designs.at(-1)!
  const chosen = designs.find(design => design.id === version) ?? latest
  const visual = useBeltVisual(title, career, { edition: chosen.edition })
  const name = titleName(career, title)
  const unified = state?.designs?.find(change => change.kind === 'unification')
  const winningShow = unified && career?.shows.find(show => show.id === unified.showId)
  const winningMatch = winningShow?.matches.find(match => match.id === unified?.matchId)
  const opening = title.holder ?? (title.vacant ? 'Vago' : 'A confirmar')
  const originalTeam = state?.holders && title.holderTeam && sameTeam(state.holders, title.holderTeam)
  const holder = state?.retiredBy ? 'Linhagem encerrada' : state && career && !originalTeam
    ? state.holders ? fighterNames(career, state.holders) : 'Vago' : opening
  const format = defenseFormat(title)
  const status = state?.retiredBy ? 'Unificado' : title.status === 'later' ? 'Surge depois' : title.status === 'unverified' ? 'A verificar'
    : format === 'mixed' ? 'Duplas mistas jogáveis' : format === 'trios' ? 'Trios jogáveis' : format === 'tag' ? 'Tag Team jogável'
      : format === 'singles' ? 'Disputa jogável' : 'Registro histórico'
  return <details className="panel report belt-card" onToggle={event => setExpanded(event.currentTarget.open)}
    style={{ '--org-accent': ORGANIZATIONS[title.promotion].accent } as CSSProperties}>
    <summary>
      <BeltVisual title={title} career={career} eager={eager} />
      <div className="belt-card-summary"><OrgMark id={title.promotion} small />
        <div className="row-text"><strong>{name}</strong><small>{title.status === 'later' ? 'Estreia posterior a janeiro' : holder}</small></div>
        <ChevronDown size={17} aria-hidden />
      </div>
      <span className="chip">{status}</span>
    </summary>
    {expanded && <div className="belt-detail">
      <div className="title-meta"><span>{ruleLabel[title.rule]} · {title.division === 'mixed' ? 'Mista' : DIVISION_LABEL[title.division]}</span><SourceLink url={title.source} /></div>
      {state && <p>Prestígio {titlePrestige(title, state.defenses, Boolean(unified))}/100
        {state.holders && ' · ' + state.defenses + ' defesas no reinado atual'}</p>}
      {format && title.holderTeam && title.listings.length > 1 && <p>Disputas na agenda de {ORGANIZATIONS[title.promotion].name} e nos eventos compartilhados dessa brand.</p>}
      {title.qualification === 'junior' && <p>Limite de {JUNIOR_WEIGHT_LIMIT} kg por lutador.</p>}
      {title.qualification === 'tamashii' && <p>Disputas nos cards do circuito TAMASHII.</p>}
      {title.note && <p>{title.note}</p>}
      {title.status === 'active' && <p>Abertura em 01/01/2026 · {opening}</p>}
      {state?.retiredBy && <p>Linhagem reunida ao {titleName(career, TITLES_BY_ID.get(state.retiredBy)!)} em {dateText(state.retiredOn!)}.</p>}
      {unified && <p>Linhagem incorporada em {dateText(unified.date)} · {TITLES_BY_ID.get(unified.secondaryId)?.name}.</p>}
      {unified?.champions && career && winningShow && winningMatch && <p>
        {fighterNames(career, unified.champions)} · {winningShow.name} · {METHOD_LABEL[winningMatch.method]} · {winningMatch.rounds} turnos.
      </p>}
      <div className="design-history">
        <h3>Histórico visual</h3>
        {designs.length > 1 && <label>Versão do cinturão<select value={chosen.id} onChange={event => setVersion(event.target.value)}>
          {[...designs].reverse().map(design => <option key={design.id} value={design.id}>{design.label}{design.from && ' · ' + dateText(design.from)}</option>)}
        </select></label>}
        <p><strong>{chosen.label}</strong>{chosen.from && ' · Desde ' + dateText(chosen.from)}{chosen.until && ' · Até ' + dateText(chosen.until)}</p>
        {chosen !== latest && <BeltVisual title={title} career={career} edition={chosen.edition} />}
        <BeltAttribution visual={visual} />
        {(title.origin !== 'fictional' && (visual.kind === 'catalog' || visual.kind === 'local')) && <LocalBeltPhotoControls titleId={title.id} />}
        {'change' in chosen.edition && career && <p className="belt-credit">Prestígio na estreia {chosen.edition.change.prestige}/100.
          {chosen.edition.change.kind === 'personalized' && ' Homenagem ao reinado de ' + fighterNames(career, chosen.edition.change.champion) + '.'}
        </p>}
      </div>
      {state && state.events.length > 0 && career && <details className="reign-history">
        <summary>Histórico de reinados ({state.events.length})</summary>
        <ol className="title-timeline">{[...state.events].reverse().map((entry, index) => <li key={entry.date + '-' + index}>
          <small>{dateText(entry.date)}</small><span>{entry.kind === 'retired' ? 'Linhagem encerrada pela unificação'
            : entry.to === null ? 'O título ficou vago'
              : fighterNames(career, entry.to) + (entry.kind === 'defense'
                ? (entry.to.length > 1 ? ' retiveram o cinturão' : ' reteve o cinturão')
                : (entry.to.length > 1 ? ' conquistaram o cinturão' : ' conquistou o cinturão') + (entry.from ? ' de ' + fighterNames(career, entry.from) : ''))}</span>
        </li>)}</ol>
      </details>}
    </div>}
  </details>
}

function UnificationPanel({ career, states, pending, onProposal }: {
  career: Career; states: BeltStates; pending: boolean; onProposal: (pair: TitlePair | null) => void
}) {
  const [selected, setSelected] = useState('')
  const promotion = career.contract?.status === 'active' ? career.contract.promotion : undefined
  const held = OPENING_TITLES.filter(title => title.promotion === promotion && states.get(title.id)?.holders?.includes(PLAYER_ID))
  const pairs = held.flatMap(first => held.flatMap(second => {
    const pair = { titleId: first.id, secondaryId: second.id }
    return canUnify(states, pair) ? [{ ...pair, label: first.name + ' + ' + second.name }] : []
  }))
  const proposal = career.titleProposal
  const decision = career.titleDecision
  if (!proposal && !decision && held.length < 2) return null
  const selection = pairs.find(pair => pair.titleId + '|' + pair.secondaryId === selected)
  const locked = pending || hasLiveBout(career)
  const stats = selection && unificationStats(states, selection)
  const pair = proposal ?? selection
  const primary = pair && TITLES_BY_ID.get(pair.titleId)
  const secondary = pair && TITLES_BY_ID.get(pair.secondaryId)
  const decisions = { approved: 'Aprovada', rejected: 'Recusada', cancelled: 'Cancelada', unified: 'Concluída' }

  return <section className="panel unification-panel" aria-label="Proposta de unificação">
    <header className="panel-head"><h2><Trophy size={18} aria-hidden /> Propor unificação</h2></header>
    <div>
      {decision && <p className="unification-status" role="status"><strong>{decisions[decision.status]} · {dateText(decision.date)}</strong><br />{decision.reason}</p>}
      {proposal ? <>
        <p className="unification-status"><strong>{TITLES_BY_ID.get(proposal.titleId)?.name} + {TITLES_BY_ID.get(proposal.secondaryId)?.name}</strong>
          <br />{proposal.approvedOn ? 'Aprovada para o próximo card elegível. Uma rodada de torneio já marcada tem prioridade.'
            : 'Em análise · resposta até ' + dateText(proposal.reviewOn) + '.'}</p>
        <button className="button secondary" disabled={locked} onClick={() => onProposal(null)}>Retirar proposta</button>
      </> : pairs.length ? <>
        <label>O primeiro cinturão continua com a linhagem unificada
          <select value={selection ? selected : ''} onChange={event => setSelected(event.target.value)} disabled={locked}>
            <option value="">Selecione dois campeonatos</option>
            {pairs.map(pair => <option key={pair.titleId + '|' + pair.secondaryId} value={pair.titleId + '|' + pair.secondaryId}>{pair.label}</option>)}
          </select></label>
        <button className="button primary" disabled={locked || !selection} onClick={() => selection && onProposal({
          titleId: selection.titleId, secondaryId: selection.secondaryId,
        })}>Enviar à diretoria</button>
        <p className="unification-status">Resposta imediata com popularidade 65, quatro defesas somadas e até 24 pontos de diferença de prestígio. Nos demais casos, a análise leva até três dias.
          {stats && <><br /><strong>{stats.defenses} defesas somadas · Diferença de prestígio {stats.gap} · Popularidade {career.popularity}</strong></>}</p>
      </> : <p>É preciso ter dois cinturões da mesma divisão, formato e regulamento, com uma defesa em cada reinado.</p>}
      {primary && secondary && <section className="unification-preview" aria-label="Prévia visual da unificação">
        <figure><BeltVisual title={primary} career={career} /><figcaption>{primary.name}</figcaption></figure>
        <figure><BeltVisual title={secondary} career={career} /><figcaption>{secondary.name}</figcaption></figure>
        <figure><BeltVisual title={primary} career={career} preview={secondary} />
          <figcaption>Modelo proposto para a unificação</figcaption></figure>
      </section>}
    </div>
  </section>
}

export default function Championships({ career, pending, onProposal }: {
  career: Career | null; pending: boolean; onProposal: (pair: TitlePair | null) => void
}) {
  const [filter, setFilter] = useState<CircuitFilter>('all')
  const [query, setQuery] = useState('')
  const states = useMemo(() => career ? titleStates(career) : null, [career])
  const keyword = searchKey(query.trim())
  const titles = OPENING_TITLES.filter(title => (filter === 'all' || title.listings.includes(filter))
    && (searchKey(title.name).includes(keyword) || searchKey(titleName(career, title)).includes(keyword)))
  return <>
    <PageTitle title="Campeonatos" intro={titles.length + ' títulos · ' + (career ? 'Reinados desta carreira' : 'Abertura em 01/01/2026')}
      action={<CircuitSelect value={filter} onChange={setFilter} />} />
    <div className="belt-filters"><label>Buscar cinturão <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {career && states && <UnificationPanel career={career} states={states} pending={pending} onProposal={onProposal} />}
    {titles.length ? <div className="belt-grid">{titles.map((title, index) =>
      <BeltCard key={title.id} title={title} career={career} state={states?.get(title.id)} eager={index < 6} />)}</div>
      : <p className="empty-line">Nenhum campeonato encontrado.</p>}
  </>
}
