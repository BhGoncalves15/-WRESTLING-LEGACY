import { ChevronDown, ImageIcon, Trophy } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { ORGANIZATIONS, OPENING_TITLES, TITLES_BY_ID } from '../content/catalog'
import { titleName, titlePrestige, unifiedTitleName } from '../content/belt-designs'
import { openingBeltPhoto, realBeltDesigns, type BeltPhoto } from '../content/belt-photos'
import { defenseFormat, JUNIOR_WEIGHT_LIMIT, type TitleRecord, type TitleRule } from '../content/titles'
import { searchKey } from '../domain/geography'
import { DIVISION_LABEL, type Career, type TitleChange, type TitlePair } from '../domain/model'
import { fighterNames, hasLiveBout, PLAYER_ID } from '../engine/career'
import { sameTeam } from '../engine/matches'
import { canUnify, titleStates, type BeltState, type BeltStates } from '../engine/titles'
import { SimulatedBelt } from './belt-art'
import { CircuitSelect, type CircuitFilter } from './world-filter'
import { dateText, OrgMark, PageTitle, SourceLink } from './shared'

const ruleLabel: Record<TitleRule, string> = {
  singles: 'Individual', junior: 'Peso júnior', cruiser: 'Peso cruzeiro', pure: 'Pure Rules', television: 'Luta com tempo regulamentado',
  rookies: 'Rookies', tag: 'Duplas', trios: 'Trios', maremoto: 'Maremoto',
}

function BeltImage({ title, name, photo, change }: { title: TitleRecord; name: string; photo?: BeltPhoto; change?: TitleChange }) {
  const [failed, setFailed] = useState(false)
  return <div className={'belt-media' + (photo && !failed ? ' belt-photo' : '')}>
    {change ? <SimulatedBelt artwork={change.artwork} name={name} initials={ORGANIZATIONS[title.promotion].initials} />
      : photo && !failed ? <img src={import.meta.env.BASE_URL + 'belts/' + photo.id + '.webp'} loading="lazy" decoding="async"
        alt={'Fotografia do ' + title.name} onError={() => setFailed(true)} />
        : <div className="belt-placeholder"><ImageIcon size={22} aria-hidden /><small>{failed ? 'Foto indisponível' : 'Foto da edição em verificação'}</small></div>}
  </div>
}

function PhotoCredit({ photo }: { photo: BeltPhoto }) {
  return <p className="belt-credit">Foto de <a href={photo.source} target="_blank" rel="noreferrer">{photo.author}</a> ·
    {' '}<a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · Recorte e redução.</p>
}

type Design = { id: string; version: string; label: string; from?: string; until?: string; photo?: BeltPhoto; change?: TitleChange }

function visualHistory(title: TitleRecord, state: BeltState | undefined): Design[] {
  const opening = openingBeltPhoto(title)
  const changes = state?.designs ?? []
  const historical = realBeltDesigns(title).filter(photo => photo !== opening).map((photo, index) => ({
    id: photo.id, version: 'Arquivo ' + (index + 1), label: 'Referência histórica', from: photo.from, until: photo.until, photo,
  }))
  return [...historical, {
    id: opening?.id ?? title.id + '-opening', version: 'Abertura', label: 'Edição de referência em 2026', photo: opening,
    from: opening?.from, until: changes[0]?.date ?? state?.retiredOn ?? (state ? undefined : opening?.until),
  }, ...changes.map((change, index) => ({
    id: change.showId, version: 'Simulação ' + (index + 1),
    label: change.kind === 'unification' ? 'Unificação' : change.kind === 'personalized' ? 'Homenagem ao campeão' : 'Reformulação',
    from: change.date, until: changes[index + 1]?.date ?? state?.retiredOn, change,
  }))]
}

function BeltCard({ title, career, state }: { title: TitleRecord; career: Career | null; state?: BeltState }) {
  const [version, setVersion] = useState('')
  const [expanded, setExpanded] = useState(false)
  const designs = visualHistory(title, state)
  const latest = designs.at(-1)!
  const chosen = designs.find(design => design.id === version) ?? latest
  const name = titleName(career, title)
  const unified = state?.designs?.find(change => change.kind === 'unification')
  const caption = chosen.change && unified && unified.date <= chosen.change.date ? unifiedTitleName(title) : title.name
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
      <div className="belt-card-art">
        <BeltImage key={latest.id} title={title} name={name} photo={latest.photo} change={latest.change} />
        {latest.change && <span className="belt-art-kind">Design fictício</span>}
      </div>
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
      {state?.retiredBy && <p>Linhagem reunida ao {unifiedTitleName(TITLES_BY_ID.get(state.retiredBy)!)} em {dateText(state.retiredOn!)}.</p>}
      {unified && <p>Linhagem incorporada em {dateText(unified.date)} · {TITLES_BY_ID.get(unified.secondaryId)?.name}.</p>}
      <div className="design-history">
        <h3>Histórico visual</h3>
        {designs.length > 1 && <label>Versão do cinturão<select value={chosen.id} onChange={event => setVersion(event.target.value)}>
          {[...designs].reverse().map(design => <option key={design.id} value={design.id}>{design.version} · {design.label}</option>)}
        </select></label>}
        <p><strong>{chosen.label}</strong>{chosen.from && ' · Desde ' + dateText(chosen.from)}{chosen.until && ' · Até ' + dateText(chosen.until)}</p>
        {chosen !== latest && <BeltImage key={chosen.id} title={title} name={caption} photo={chosen.photo} change={chosen.change} />}
        {chosen.photo && <PhotoCredit photo={chosen.photo} />}
        {chosen.change && career && <p className="belt-credit">
          Arte original gerada no jogo · Prestígio na estreia {chosen.change.prestige}/100.
          {' '}{chosen.change.kind === 'unification' ? 'Novo cinturão após defesas dos mesmos campeões nos dois reinados.'
            : chosen.change.kind === 'personalized' ? 'Homenagem ao reinado de ' + fighterNames(career, chosen.change.champion) + '.'
              : 'A diretoria atualizou a identidade visual após um ciclo da divisão.'}
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
  if (!proposal && held.length < 2) return null
  const selection = pairs.find(pair => pair.titleId + '|' + pair.secondaryId === selected)
  const locked = pending || hasLiveBout(career)
  return <section className="panel unification-panel" aria-label="Proposta de unificação">
    <header className="panel-head"><h2><Trophy size={18} aria-hidden /> Propor unificação</h2></header>
    <div>
      {proposal ? <>
        <p>{TITLES_BY_ID.get(proposal.titleId)?.name} + {TITLES_BY_ID.get(proposal.secondaryId)?.name} · Aguardando o próximo evento especial.</p>
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
      </> : <p>É preciso ter dois cinturões da mesma divisão, formato e regulamento, com uma defesa em cada reinado.</p>}
    </div>
  </section>
}

export default function Championships({ career, pending, onProposal }: {
  career: Career | null; pending: boolean; onProposal: (pair: TitlePair | null) => void
}) {
  const [filter, setFilter] = useState<CircuitFilter>('all')
  const [query, setQuery] = useState('')
  const states = useMemo(() => career ? titleStates(career) : null, [career])
  const titles = OPENING_TITLES.filter(title => (filter === 'all' || title.listings.includes(filter))
    && searchKey(titleName(career, title)).includes(searchKey(query)))
  return <>
    <PageTitle title="Campeonatos" intro={titles.length + ' títulos · ' + (career ? 'Reinados desta carreira' : 'Abertura em 01/01/2026')}
      action={<CircuitSelect value={filter} onChange={setFilter} />} />
    <div className="belt-filters"><label>Buscar cinturão <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {career && states && <UnificationPanel career={career} states={states} pending={pending} onProposal={onProposal} />}
    {titles.length ? <div className="belt-grid">{titles.map(title => <BeltCard key={title.id} title={title} career={career} state={states?.get(title.id)} />)}</div>
      : <p className="empty-line">Nenhum campeonato encontrado.</p>}
  </>
}
