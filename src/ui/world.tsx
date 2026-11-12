import { ArrowRight, Building2, CalendarDays, ChevronDown, ChevronRight, Flame, Newspaper, Swords, Trophy } from 'lucide-react'
import { useState } from 'react'
import { OPENING_TITLES, ORGANIZATIONS, rosterFor, upcomingShows } from '../content/catalog'
import { DIVISION_LABEL, METHOD_LABEL, PROMOTIONS, START_DATE, addDays, overall, type Career, type PromotionId, type ShowReport } from '../domain/model'
import { fighterName, hasLiveBout, nextCareerShow, PLAYER_ID, recordFor, showEvidence } from '../engine/career'
import { dateShort, dateText, EmptyState, OrgMark, PageTitle, SourceLink, UpcomingList } from './shared'

export function Home({ career, pending, onNew, onSaves, onCalendar, onCompanies, onContracts, onFight, onAdvance }: {
  career: Career | null; pending: boolean; onNew: () => void; onSaves: () => void; onCalendar: () => void;
  onCompanies: () => void; onContracts: () => void; onFight: () => void; onAdvance: () => void
}) {
  const live = career && hasLiveBout(career)
  const active = career?.contract?.status === 'active' ? ORGANIZATIONS[career.contract.promotion] : null
  const next = career && nextCareerShow(career)
  const record = career && recordFor(career, PLAYER_ID)
  const upcoming = upcomingShows(career?.worldThrough ?? addDays(START_DATE, -1), 2).slice(0, 4)
  const action = live ? onFight : active ? onAdvance : career ? onContracts : onNew
  const caption = live ? 'Entrar no combate' : active ? 'Avançar calendário' : career ? 'Ver propostas' : 'Nova carreira'
  return <>
    <section className="hero" style={{ '--arena-art': 'url(' + import.meta.env.BASE_URL + 'art/arena.webp)' } as React.CSSProperties}>
      <div className="hero-copy">
        <span className="hero-kicker"><span /> {active ? active.name + ' / Carreira Livre' : 'Carreira Livre'}</span>
        <h1>{career ? career.profile.name : <>O ringue<br />é seu.</>}</h1>
        <p>{live ? 'Você está no card. Escolha seu próximo movimento.' : active && next ? 'Próximo show · ' + next.name
          : career ? 'O mercado abriu três caminhos para sua carreira.' : 'Crie seu lutador, negocie seu primeiro contrato e decida cada movimento no ringue.'}</p>
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
        <header className="panel-head"><h2><Building2 size={19} aria-hidden /> Empresas do piloto</h2>
          <button className="text-button" onClick={onCompanies}>Elencos <ChevronRight size={16} aria-hidden /></button></header>
        <ul className="rows">{PROMOTIONS.map(id => <li className="event-row" key={id}>
          <OrgMark id={id} small /><div className="row-text"><strong>{ORGANIZATIONS[id].name}</strong><small>{rosterFor(id).length} lutadores no recorte</small></div>
          {active?.id === id && <span className="chip">Seu contrato</span>}
        </li>)}</ul>
      </section>
    </div>
  </>
}

function Results({ report, career }: { report: ShowReport; career: Career }) {
  return <ul className="rows match-results">
    {report.matches.map(match => <li className="record-row" key={match.id}>
      <div className="row-text"><strong>{fighterName(career, match.firstId)} × {fighterName(career, match.secondId)}</strong>
        <small>{fighterName(career, match.winnerId)} venceu · {METHOD_LABEL[match.method]}</small></div>
      <span className="chip">{match.player ? 'Sua luta' : 'Singles'}</span>
    </li>)}
  </ul>
}

export function Calendar({ career, pending, onAdvance, onFight }: {
  career: Career | null; pending: boolean; onAdvance: () => void; onFight: () => void
}) {
  const [filter, setFilter] = useState<PromotionId | 'all'>('all')
  const [period, setPeriod] = useState<'upcoming' | 'completed'>('upcoming')
  const upcoming = upcomingShows(career?.worldThrough ?? addDays(START_DATE, -1), 6).filter(show => filter === 'all' || filter === show.promotion)
  const reports = [...(career?.shows ?? [])].reverse().filter(show => filter === 'all' || filter === show.promotion)
  const live = career && hasLiveBout(career)
  const next = career && nextCareerShow(career)
  return <>
    <PageTitle title="Calendário" intro={dateText(career?.date ?? START_DATE)}
      action={career && <button className="button primary" disabled={pending} onClick={live ? onFight : onAdvance}>
        {live ? 'Entrar no combate' : 'Avançar calendário'} <ArrowRight size={17} aria-hidden />
      </button>} />
    {career && !live && next && <div className="inline-note"><CalendarDays size={18} aria-hidden /><span>Próxima parada · {next.name} · {dateText(next.date)}</span></div>}
    <div className="filter-bar">
      <div className="segmented" role="group" aria-label="Período">
        <button aria-pressed={period === 'upcoming'} onClick={() => setPeriod('upcoming')}>Próximos</button>
        <button aria-pressed={period === 'completed'} onClick={() => setPeriod('completed')}>Resultados</button>
      </div>
      <label>Empresa<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
        <option value="all">Todas</option>{PROMOTIONS.map(id => <option value={id} key={id}>{ORGANIZATIONS[id].name}</option>)}</select></label>
    </div>
    {period === 'upcoming' ? <section className="panel">
      <ul className="rows">{upcoming.map(show => {
        const source = showEvidence(show.id)
        return <li className="event-row calendar-row" key={show.id}>
          <span className="date-stamp">{dateShort(show.date)}</span><div className="row-text">
            <strong>{show.name}</strong><small>{ORGANIZATIONS[show.promotion].name} · {show.origin === 'announced' ? 'Data anunciada' : 'Agenda simulada'}</small>
          </div>{source && <SourceLink url={source} />}
        </li>
      })}</ul>
    </section> : career && reports.length ? <div className="stack">
      {reports.map(report => <details className="panel report" key={report.id}>
        <summary><OrgMark id={report.promotion} small /><div className="row-text"><strong>{report.name}</strong>
          <small>{dateText(report.date)} · {report.matches.length} resultados{live && career.bout?.showId === report.id ? ' · sua luta em andamento' : ''}</small>
        </div><ChevronDown size={19} aria-hidden /></summary><Results report={report} career={career} />
      </details>)}
    </div> : <EmptyState title="Nenhum resultado neste filtro">Os cards aparecem aqui depois de simulados.</EmptyState>}
  </>
}

export function Companies({ career }: { career: Career | null }) {
  const [selected, setSelected] = useState<PromotionId>(career?.contract?.promotion ?? 'nxt')
  const org = ORGANIZATIONS[selected]
  const roster = rosterFor(selected)
  return <>
    <PageTitle title="Empresas" intro="Elencos do recorte inicial em 1º de janeiro de 2026." />
    <div className="org-grid" role="group" aria-label="Escolha uma empresa">
      {PROMOTIONS.map(id => <button className="panel org-selector" aria-pressed={selected === id} key={id} onClick={() => setSelected(id)}>
        <OrgMark id={id} /><div className="row-text"><strong>{ORGANIZATIONS[id].name}</strong><small>{rosterFor(id).length} lutadores</small></div>
      </button>)}
    </div>
    <section className="panel roster">
      <header className="panel-head"><div><h2>{org.name}</h2><p>{org.description} Estilos e OVR são parâmetros do jogo.</p></div><SourceLink url={org.source} /></header>
      <ul className="rows">{roster.map(fighter => {
        const record = career && recordFor(career, fighter.id)
        return <li className="roster-row" key={fighter.id}>
          <div className="row-text"><strong>{fighter.name}</strong><small>{DIVISION_LABEL[fighter.division]} · {fighter.style}</small></div>
          <span className="chip">OVR {overall(fighter.attributes, fighter.style)}</span>
          {record && <small>{record.wins} V · {record.losses} D</small>}
          <SourceLink url={fighter.appearance.source} />
        </li>
      })}</ul>
    </section>
  </>
}

export function Championships() {
  const [filter, setFilter] = useState<PromotionId | 'all'>('all')
  const titles = OPENING_TITLES.filter(title => filter === 'all' || title.promotion === filter)
  return <>
    <PageTitle title="Campeonatos" intro="Registro histórico do piloto em 01/01/2026. Disputas de cinturões entram na etapa de campeonatos."
      action={<label>Empresa<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
        <option value="all">Todas</option>{PROMOTIONS.map(id => <option key={id} value={id}>{ORGANIZATIONS[id].name}</option>)}
      </select></label>} />
    <section className="panel"><ul className="rows">{titles.map(title => <li className="roster-row" key={title.id}>
      <OrgMark id={title.promotion} small /><div className="row-text"><strong>{title.name}</strong>
        <small>{title.holder ?? 'Estreia posterior ao recorte'}</small></div><SourceLink url={title.source} />
    </li>)}</ul></section>
  </>
}

export function Feed({ career, history = false }: { career: Career; history?: boolean }) {
  const [filter, setFilter] = useState<PromotionId | 'all'>('all')
  const [limit, setLimit] = useState(25)
  const records = [...career.history].reverse().filter(item => (
    (history || ['show', 'match', 'contract'].includes(item.kind)) && (filter === 'all' || item.promotion === filter)
  ))
  const record = recordFor(career, PLAYER_ID)
  return <>
    <PageTitle title={history ? 'Histórico' : 'Notícias'} intro={history
      ? career.profile.name + ' · ' + record.wins + ' vitórias · ' + record.losses + ' derrotas'
      : 'Acontecimentos deste universo simulado.'}
      action={<label>Empresa<select value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setLimit(25) }}>
        <option value="all">Todas</option>{PROMOTIONS.map(id => <option value={id} key={id}>{ORGANIZATIONS[id].name}</option>)}
      </select></label>} />
    {records.length ? <section className="panel"><ul className="rows">{records.slice(0, limit).map(item => <li className="feed-row" key={item.id}>
      {item.promotion ? <OrgMark id={item.promotion} small /> : <Newspaper size={21} aria-hidden />}
      <div className="row-text"><small>{dateText(item.date)}</small><strong>{item.title}</strong><p>{item.detail}</p></div>
    </li>)}</ul>{records.length > limit && <div className="form-footer"><button className="button secondary" onClick={() => setLimit(limit + 25)}>Ver mais</button></div>}</section>
      : <EmptyState title="O calendário vai movimentar o universo">As atualizações aparecem aqui conforme os shows e as negociações acontecem.</EmptyState>}
  </>
}
