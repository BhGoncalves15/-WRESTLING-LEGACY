import { ArrowRight, Building2, CalendarDays, ChevronDown, ChevronRight, Flame, Newspaper, Search, Swords, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  ANNOUNCED_SHOWS, ARCHIVE_2026, COMPANY_NAMES, OPENING_TITLES, ORGANIZATIONS, TITLES_BY_ID, evidenceFor, rosterFor, showPromotions, upcomingShows,
} from '../content/catalog'
import { HISTORICAL_OBSERVATIONS } from '../content/research-2026'
import { TEAM_REFERENCES } from '../content/tag-teams'
import { JUNIOR_WEIGHT_LIMIT, defenseFormat, type TitleRule } from '../content/titles'
import { COMPANIES, DIVISION_LABEL, MATCH_FORMAT_LABEL, METHOD_LABEL, PROMOTIONS, START_DATE, addDays, overall, type Career, type PromotionId, type ShowReport } from '../domain/model'
import { fighterName, fighterNames, hasLiveBout, nextCareerShow, PLAYER_ID, recordFor, showEvidence } from '../engine/career'
import { formatForSize, matchTeams, matchWinners, sameTeam } from '../engine/matches'
import { titleStates } from '../engine/titles'
import { dateShort, dateText, EmptyState, OrgMark, PageTitle, SourceLink, UpcomingList } from './shared'

type CircuitFilter = PromotionId | 'all'

function CircuitSelect({ value, onChange }: { value: CircuitFilter; onChange: (value: CircuitFilter) => void }) {
  return <label>Empresa ou brand<select value={value} onChange={event => onChange(event.target.value as CircuitFilter)}>
    <option value="all">Todas</option>{PROMOTIONS.map(id => <option value={id} key={id}>{ORGANIZATIONS[id].name}</option>)}
  </select></label>
}

export function Home({ career, pending, onNew, onSaves, onCalendar, onCompanies, onContracts, onFight, onAdvance }: {
  career: Career | null; pending: boolean; onNew: () => void; onSaves: () => void; onCalendar: () => void;
  onCompanies: () => void; onContracts: () => void; onFight: () => void; onAdvance: () => void
}) {
  const live = career && hasLiveBout(career)
  const active = career?.contract?.status === 'active' ? ORGANIZATIONS[career.contract.promotion] : null
  const next = career && nextCareerShow(career)
  const record = career && recordFor(career, PLAYER_ID)
  const upcoming = upcomingShows(career?.worldThrough ?? addDays(START_DATE, -1), 2).slice(0, 5)
  const action = live ? onFight : active ? onAdvance : career ? onContracts : onNew
  const caption = live ? 'Entrar no combate' : active ? 'Avançar calendário' : career ? 'Ver propostas' : 'Nova carreira'
  return <>
    <section className="hero" style={{ '--arena-art': 'url(' + import.meta.env.BASE_URL + 'art/arena.webp)' } as React.CSSProperties}>
      <div className="hero-copy">
        <span className="hero-kicker"><span /> {active ? active.name + ' / Carreira Livre' : 'Carreira Livre'}</span>
        <h1>{career ? career.profile.name : <>O ringue<br />é seu.</>}</h1>
        <p>{live ? 'Você está no card. Escolha seu próximo movimento.' : active && next ? 'Próximo show · ' + next.name
          : active ? 'Seu contrato está perto do fim. Avance o calendário.' : career ? 'O mercado apresentou suas propostas.' : 'Crie seu lutador, negocie seu primeiro contrato e decida cada movimento no ringue.'}</p>
        <div className="hero-actions">
          <button className="button primary" onClick={action} disabled={pending}>{caption} <ArrowRight size={18} aria-hidden /></button>
          <button className="button glass" onClick={career ? onCalendar : onSaves}>{career ? 'Ver calendário' : 'Salvamentos'}</button>
        </div>
      </div>
      <span className="art-credit">Ilustração original</span>
    </section>
    {career && record && <div className="stats-grid overview-stats">
      <div className="panel stat"><Swords aria-hidden /><span>Cartel</span><strong>{record.wins} V · {record.losses} D</strong></div>
      <div className="panel stat"><Flame aria-hidden /><span>XP disponível</span><strong>{career.xp}</strong></div>
      <div className="panel stat"><Trophy aria-hidden /><span>OVR</span><strong>{overall(career.profile.attributes, career.profile.style)}</strong></div>
      <div className="panel stat"><CalendarDays aria-hidden /><span>Shows simulados</span><strong>{career.shows.length}</strong></div>
    </div>}
    <div className="two-col dashboard-panels">
      <UpcomingList shows={upcoming} onCalendar={onCalendar} />
      <section className="panel">
        <header className="panel-head"><h2><Building2 size={19} aria-hidden /> Empresas</h2>
          <button className="text-button" onClick={onCompanies}>Ver elencos <ChevronRight size={16} aria-hidden /></button></header>
        <ul className="rows">{COMPANIES.map(company => {
          const circuits = PROMOTIONS.filter(id => ORGANIZATIONS[id].company === company)
          const representative = circuits[0]
          return <li className="event-row" key={company}>
            {company === 'wwe' ? <span className="org-mark small wwe-mark" aria-hidden>WWE</span> : <OrgMark id={representative} small />}
            <div className="row-text"><strong>{COMPANY_NAMES[company]}</strong><small>{company === 'wwe'
              ? 'Raw · SmackDown · NXT' : rosterFor(representative, false).length + ' lutadores no recorte'}</small></div>
            {active?.company === company && <span className="chip">Seu contrato</span>}
          </li>
        })}</ul>
      </section>
    </div>
  </>
}

function Results({ report, career }: { report: ShowReport; career: Career }) {
  return <ul className="rows match-results">
    {report.matches.map(match => {
      const [first, second] = matchTeams(match)
      const format = MATCH_FORMAT_LABEL[formatForSize(first.length, match.tag?.mixed)]
      const winner = fighterNames(career, matchWinners(match))
      const finisher = match.tag ? ' de ' + fighterName(career, match.winnerId) : ''
      return <li className="record-row" key={match.id}>
        <div className="row-text"><strong>{fighterNames(career, first)} × {fighterNames(career, second)}</strong>
          <small>{winner} {match.tag ? 'venceram' : 'venceu'} · {METHOD_LABEL[match.method]}{finisher}</small>
          {match.titleId && <small className="belt-label">{TITLES_BY_ID.get(match.titleId)?.name}</small>}
          {match.tag && match.player && <small>Sua luta</small>}
        </div>
        <span className="chip">{match.tag ? format : match.player ? 'Sua luta' : match.titleId ? 'Cinturão' : format}</span>
      </li>
    })}
  </ul>
}

export function Calendar({ career, pending, onAdvance, onFight }: {
  career: Career | null; pending: boolean; onAdvance: () => void; onFight: () => void
}) {
  const [filter, setFilter] = useState<CircuitFilter>('all')
  const [period, setPeriod] = useState<'upcoming' | 'announced' | 'completed' | 'archive'>('upcoming')
  const after = career?.worldThrough ?? addDays(START_DATE, -1)
  const upcoming = (period === 'announced' ? ANNOUNCED_SHOWS.filter(show => show.date > after) : upcomingShows(after, 6))
    .filter(show => filter === 'all' || showPromotions(show).includes(filter))
  const reports = [...(career?.shows ?? [])].reverse().filter(show => filter === 'all' || showPromotions(show).includes(filter))
  const archive = ARCHIVE_2026.filter(show => filter === 'all' || filter === show.promotion)
  const live = career && hasLiveBout(career)
  const next = career && nextCareerShow(career)
  return <>
    <PageTitle title="Calendário" intro={dateText(career?.date ?? START_DATE)}
      action={career && <button className="button primary" disabled={pending} onClick={live ? onFight : onAdvance}>
        {live ? 'Entrar no combate' : 'Avançar calendário'} <ArrowRight size={17} aria-hidden />
      </button>} />
    {career && !live && next && <div className="inline-note"><CalendarDays size={18} aria-hidden /><span>Próxima parada · {next.name} · {dateText(next.date)}</span></div>}
    <div className="filter-bar">
      <div className="segmented" role="group" aria-label="Tipo de agenda">
        {([['upcoming', 'Próximos'], ['announced', 'Anunciados'], ['completed', 'Resultados'], ['archive', 'Arquivo real 2026']] as const)
          .map(([value, label]) => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
      </div>
      <CircuitSelect value={filter} onChange={setFilter} />
    </div>
    {(period === 'upcoming' || period === 'announced') && (upcoming.length ? <section className="panel">
      <ul className="rows">{upcoming.map(show => {
        const source = showEvidence(show.id)
        return <li className="event-row calendar-row" key={show.id}>
          <span className="date-stamp">{dateShort(show.date)}</span><div className="row-text">
            <strong>{show.name}</strong><small>{showPromotions(show).map(id => ORGANIZATIONS[id].name).join(' + ')} · {show.origin === 'announced' ? 'Data anunciada' : 'Agenda simulada'}</small>
          </div>{source && <SourceLink url={source} />}
        </li>
      })}</ul>
    </section> : <EmptyState title="Nenhum evento neste filtro">Consulte as outras empresas ou a agenda simulada.</EmptyState>)}
    {period === 'completed' && (career && reports.length ? <div className="stack">
      {reports.map(report => <details className="panel report" key={report.id}>
        <summary><OrgMark id={report.promotion} small /><div className="row-text"><strong>{report.name}</strong>
          <small>{dateText(report.date)} · {report.matches.length} resultados{live && career.bout?.showId === report.id ? ' · sua luta em andamento' : ''}</small>
        </div><ChevronDown size={19} aria-hidden /></summary><Results report={report} career={career} />
      </details>)}
    </div> : <EmptyState title="Nenhum resultado neste filtro">Os cards aparecem aqui depois de simulados.</EmptyState>)}
    {period === 'archive' && <section className="panel">
      <header className="panel-head"><div><h2>Eventos reais de 2026</h2><p>Referências históricas para consulta. Os resultados da carreira seguem a simulação.</p></div></header>
      <ul className="rows">{archive.map(show => <li className="event-row" key={show.promotion + show.date + show.name}>
        <span className="date-stamp">{dateShort(show.date)}</span><div className="row-text"><strong>{show.name}</strong><small>{ORGANIZATIONS[show.promotion].name}</small></div>
        <SourceLink url={show.source} />
      </li>)}</ul>
    </section>}
  </>
}

export function Companies({ career }: { career: Career | null }) {
  const [selected, setSelected] = useState<PromotionId>(career?.contract?.promotion ?? 'nxt')
  const [search, setSearch] = useState('')
  const org = ORGANIZATIONS[selected]
  const roster = rosterFor(selected)
  const teams = TEAM_REFERENCES.filter(team => team.promotion === selected)
  const observations = HISTORICAL_OBSERVATIONS.filter(entry => entry.promotion === selected)
  const filtered = roster.filter(fighter => [fighter.name, ...(fighter.aliases ?? [])].some(value => value.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))))
  return <>
    <PageTitle title="Empresas" intro="Sete empresas e nove agendas. Elencos de abertura em 1º de janeiro de 2026." />
    <div className="org-grid" role="group" aria-label="Escolha uma empresa ou brand">
      {PROMOTIONS.map(id => <button className="panel org-selector" aria-pressed={selected === id} key={id} onClick={() => { setSelected(id); setSearch('') }}>
        <OrgMark id={id} /><div className="row-text"><strong>{ORGANIZATIONS[id].name}</strong><small>{rosterFor(id).length} no recorte</small></div>
      </button>)}
    </div>
    <section className="panel roster">
      <header className="panel-head"><div><h2>{org.name}</h2><p>{org.description} Estilos, alinhamentos e OVR são parâmetros de jogo.</p></div><SourceLink url={org.source} /></header>
      <div className="roster-filter"><label><span><Search size={14} aria-hidden /> Buscar lutador</span>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome de ringue" /></label><small>{filtered.length} {filtered.length === 1 ? 'perfil' : 'perfis'}</small></div>
      <ul className="rows">{filtered.map(fighter => {
        const record = career && recordFor(career, fighter.id)
        return <li className="roster-row" key={fighter.id}>
          <div className="row-text"><strong>{fighter.name}</strong><small>{DIVISION_LABEL[fighter.division]} · {fighter.style}
            {fighter.promotion !== selected ? ' · Aparição cruzada' : ''}</small></div>
          <span className="chip">OVR {overall(fighter.attributes, fighter.style)}</span>
          {record && <small>{record.wins} V · {record.losses} D</small>}
          <SourceLink url={evidenceFor(fighter, selected)!.source} />
        </li>
      })}</ul>
      {filtered.length === 0 && <p className="empty-line">Nenhum lutador corresponde à busca.</p>}
    </section>
    {teams.length > 0 && <section className="panel reference-roster">
      <header className="panel-head"><h2>Duplas e trios de referência</h2></header>
      <ul className="rows">{teams.map(team => <li className="record-row" key={team.members.join('+')}>
        <div className="row-text"><strong>{team.label}</strong></div><SourceLink url={team.source} />
      </li>)}</ul>
    </section>}
    {observations.length > 0 && <section className="panel reference-roster">
      <header className="panel-head"><div><h2>Registros reais após a abertura</h2><p>Acontecimentos de referência de 2026 para consulta.</p></div></header>
      <ul className="rows">{observations.map(entry => <li className="record-row" key={entry.id + entry.date}>
        <div className="row-text"><strong>{entry.name}</strong><small>{dateText(entry.date)} · {entry.detail}</small></div>
        <SourceLink url={entry.source} />
      </li>)}</ul>
    </section>}
  </>
}

const ruleLabel: Record<TitleRule, string> = {
  singles: 'Individual', junior: 'Peso júnior', cruiser: 'Peso cruzeiro', pure: 'Pure Rules', television: 'Luta com tempo regulamentado',
  rookies: 'Rookies', tag: 'Duplas', trios: 'Trios', maremoto: 'Maremoto',
}

export function Championships({ career }: { career: Career | null }) {
  const [filter, setFilter] = useState<CircuitFilter>('all')
  const states = useMemo(() => career ? titleStates(career) : null, [career])
  const titles = OPENING_TITLES.filter(title => filter === 'all' || title.listings.includes(filter))
  return <>
    <PageTitle title="Campeonatos" intro={titles.length + ' títulos · ' + (career ? 'Reinados desta carreira' : 'Abertura em 01/01/2026')}
      action={<CircuitSelect value={filter} onChange={setFilter} />} />
    <div className="stack">{titles.map(title => {
      const state = states?.get(title.id)
      const opening = title.holder ?? (title.vacant ? 'Vago' : 'A confirmar')
      const openingTeam = state?.holders && title.holderTeam && sameTeam(state.holders, title.holderTeam)
      const current = state && career && !openingTeam ? state.holders ? fighterNames(career, state.holders) : 'Vago' : opening
      const format = defenseFormat(title)
      const status = title.status === 'later' ? 'Surge depois' : title.status === 'unverified' ? 'A verificar'
        : format === 'mixed' ? 'Duplas mistas jogáveis' : format === 'trios' ? 'Trios jogáveis' : format === 'tag' ? 'Tag Team jogável'
          : format === 'singles' ? 'Disputa jogável' : 'Registro histórico'
      return <details className="panel report title-row" key={title.id}>
        <summary><OrgMark id={title.promotion} small /><div className="row-text"><strong>{title.name}</strong>
          <small>{title.status === 'later' ? 'Estreia posterior a janeiro' : current}</small></div>
          <span className="chip">{status}</span><ChevronDown size={18} aria-hidden /></summary>
        <div className="title-detail">
          <div className="title-meta"><span>{ruleLabel[title.rule]} · {title.division === 'mixed' ? 'Mista' : DIVISION_LABEL[title.division]}</span><SourceLink url={title.source} /></div>
          {format && title.holderTeam && title.listings.length > 1 && <p>Disputas na agenda de {ORGANIZATIONS[title.promotion].name} e nos eventos compartilhados dessa brand.</p>}
          {title.qualification === 'junior' && <p>Limite de {JUNIOR_WEIGHT_LIMIT} kg por lutador.</p>}
          {title.qualification === 'tamashii' && <p>Disputas nos cards do circuito TAMASHII.</p>}
          {title.note && <p>{title.note}</p>}
          {title.status === 'active' && <p>Abertura em 01/01/2026 · {opening}</p>}
          {state?.holders && <p>Reinado na carreira desde {dateText(state.heldFrom)} · {state.defenses} defesas bem-sucedidas</p>}
          {state && state.events.length > 0 && career && <ol className="title-timeline">
            {[...state.events].reverse().map((entry, index) => <li key={entry.date + '-' + index}>
              <small>{dateText(entry.date)}</small><span>{entry.to === null ? 'O título ficou vago'
                : fighterNames(career, entry.to) + (entry.kind === 'defense'
                  ? (entry.to.length > 1 ? ' retiveram o cinturão' : ' reteve o cinturão')
                  : (entry.to.length > 1 ? ' conquistaram o cinturão' : ' conquistou o cinturão') + (entry.from ? ' de ' + fighterNames(career, entry.from) : ''))}</span>
            </li>)}
          </ol>}
        </div>
      </details>
    })}</div>
  </>
}

export function Feed({ career, history = false }: { career: Career; history?: boolean }) {
  const [filter, setFilter] = useState<CircuitFilter>('all')
  const [limit, setLimit] = useState(25)
  const records = [...career.history].reverse().filter(item => (
    (history || ['show', 'match', 'contract', 'title', 'team'].includes(item.kind)) && (filter === 'all' || item.promotion === filter)
  ))
  const record = recordFor(career, PLAYER_ID)
  return <>
    <PageTitle title={history ? 'Histórico' : 'Notícias'} intro={history
      ? career.profile.name + ' · ' + record.wins + ' vitórias · ' + record.losses + ' derrotas'
      : 'Acontecimentos deste universo simulado.'}
      action={<CircuitSelect value={filter} onChange={value => { setFilter(value); setLimit(25) }} />} />
    {records.length ? <section className="panel"><ul className="rows">{records.slice(0, limit).map(item => <li className="feed-row" key={item.id}>
      {item.promotion ? <OrgMark id={item.promotion} small /> : <Newspaper size={21} aria-hidden />}
      <div className="row-text"><small>{dateText(item.date)}</small><strong>{item.title}</strong><p>{item.detail}</p></div>
    </li>)}</ul>{records.length > limit && <div className="form-footer"><button className="button secondary" onClick={() => setLimit(limit + 25)}>Ver mais</button></div>}</section>
      : <EmptyState title="O calendário vai movimentar o universo">As atualizações aparecem aqui conforme os shows e as negociações acontecem.</EmptyState>}
  </>
}
