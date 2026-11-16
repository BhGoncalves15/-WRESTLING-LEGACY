import { ArrowRight, Building2, CalendarDays, ChevronRight, Flame, Newspaper, Search, Swords, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  COMPANY_NAMES, OPENING_TITLES, ORGANIZATIONS, evidenceFor, rosterFor, upcomingShows,
} from '../content/catalog'
import { titleName } from '../content/belt-designs'
import { HISTORICAL_OBSERVATIONS } from '../content/research-2026'
import { TEAM_REFERENCES } from '../content/tag-teams'
import { COMPANIES, DIVISION_LABEL, PROMOTIONS, START_DATE, addDays, overall, type Career, type PromotionId } from '../domain/model'
import { hasLiveBout, nextCareerShow, PLAYER_ID, recordFor } from '../engine/career'
import { defaultAppearance } from '../domain/appearance'
import { titleStates } from '../engine/titles'
import { FighterAvatar } from './avatar'
import { BeltVisual } from './belt-art'
import { CircuitSelect, type CircuitFilter } from './world-filter'
import { dateText, EmptyState, OrgMark, PageTitle, SourceLink, UpcomingList } from './shared'

export function Home({ career, pending, onNew, onSaves, onCalendar, onCompanies, onContracts, onFight, onAdvance }: {
  career: Career | null; pending: boolean; onNew: () => void; onSaves: () => void; onCalendar: () => void;
  onCompanies: () => void; onContracts: () => void; onFight: () => void; onAdvance: () => void
}) {
  const live = career && hasLiveBout(career)
  const active = career?.contract?.status === 'active' ? ORGANIZATIONS[career.contract.promotion] : null
  const next = career && nextCareerShow(career)
  const record = career && recordFor(career, PLAYER_ID)
  const upcoming = upcomingShows(career?.worldThrough ?? addDays(START_DATE, -1), 2, career?.calendar).slice(0, 5)
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

const searchKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')

export function Companies({ career }: { career: Career | null }) {
  const [selected, setSelected] = useState<PromotionId>(career?.contract?.promotion ?? 'nxt')
  const [search, setSearch] = useState('')
  const org = ORGANIZATIONS[selected]
  const roster = rosterFor(selected)
  const teams = TEAM_REFERENCES.filter(team => team.promotion === selected)
  const observations = HISTORICAL_OBSERVATIONS.filter(entry => entry.promotion === selected)
  const belts = useMemo(() => career ? titleStates(career) : null, [career])
  const localTitles = OPENING_TITLES.filter(title => title.listings.includes(selected))
  const query = searchKey(search.trim())
  const filtered = roster.filter(fighter => [fighter.name, ...(fighter.aliases ?? [])].some(value => searchKey(value).includes(query)))
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
        const held = localTitles.filter(title => belts
          ? belts.get(title.id)?.holders?.includes(fighter.id)
          : title.holderId === fighter.id || title.holderTeam?.includes(fighter.id))
        return <li className={'roster-row' + (held.length ? ' roster-champion' : '')} key={fighter.id}>
          <div className="row-text"><strong>{fighter.name}</strong><small>{DIVISION_LABEL[fighter.division]} · {fighter.style}
            {fighter.promotion !== selected ? ' · Aparição cruzada' : ''}</small></div>
          <span className="chip">OVR {overall(fighter.attributes, fighter.style)}</span>
          {record && <small>{record.wins} V · {record.losses} D</small>}
          <SourceLink url={evidenceFor(fighter, selected)!.source} />
          {held.length > 0 && <div className="roster-belts">{held.map(title => <figure key={title.id}>
            <BeltVisual title={title} career={career} size="thumbnail" />
            <figcaption>{titleName(career, title)}</figcaption>
          </figure>)}</div>}
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

export function Feed({ career, history = false }: { career: Career; history?: boolean }) {
  const [filter, setFilter] = useState<CircuitFilter>('all')
  const [limit, setLimit] = useState(25)
  const records = [...career.history].reverse().filter(item => (
    (history || ['show', 'match', 'contract', 'title', 'team', 'rivalry', 'tournament'].includes(item.kind)) && (filter === 'all' || item.promotion === filter)
  ))
  const record = recordFor(career, PLAYER_ID)
  return <>
    <PageTitle title={history ? 'Histórico' : 'Notícias'} intro={history
      ? career.profile.name + ' · ' + record.wins + ' vitórias · ' + record.losses + ' derrotas'
      : 'Acontecimentos deste universo simulado.'}
      action={<CircuitSelect value={filter} onChange={value => { setFilter(value); setLimit(25) }} />} />
    {history && <div className="identity-strip"><FighterAvatar name={career.profile.name} look={career.profile.look ?? defaultAppearance()} />
      <div className="row-text"><strong>{career.profile.name}</strong><small>{career.profile.style} · {career.profile.alignment}</small></div>
    </div>}
    {records.length ? <section className="panel"><ul className="rows">{records.slice(0, limit).map(item => <li className="feed-row" key={item.id}>
      {item.participantId === PLAYER_ID ? <FighterAvatar name={career.profile.name} look={career.profile.look ?? defaultAppearance()} />
        : item.promotion ? <OrgMark id={item.promotion} small /> : <Newspaper size={21} aria-hidden />}
      <div className="row-text"><small>{dateText(item.date)}</small><strong>{item.title}</strong><p>{item.detail}</p></div>
    </li>)}</ul>{records.length > limit && <div className="form-footer"><button className="button secondary" onClick={() => setLimit(limit + 25)}>Ver mais</button></div>}</section>
      : <EmptyState title="O calendário vai movimentar o universo">As atualizações aparecem aqui conforme os shows e as negociações acontecem.</EmptyState>}
  </>
}
