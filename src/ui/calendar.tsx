import { BeltVisual } from './belt-art'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Swords } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ARCHIVE_2026, ORGANIZATIONS, TITLES_BY_ID, showPromotions, showReference, showsThrough, upcomingShows } from '../content/catalog'
import { beltVisualFor } from '../content/belt-catalog'
import { roundName, tournamentEdition, tournamentSlots } from '../content/tournaments'
import { MATCH_FORMAT_LABEL, METHOD_LABEL, START_DATE, addDays, type Career, type Show, type ShowReport } from '../domain/model'
import { fighterName, fighterNames, hasLiveBout, nextCareerShow, pendingUnificationBout } from '../engine/career'
import { matchFormat, matchTeams, matchWinners } from '../engine/matches'
import { defaultAppearance } from '../domain/appearance'
import { FighterAvatar } from './avatar'
import { CircuitSelect, type CircuitFilter } from './world-filter'
import { dateShort, dateText, EmptyState, OrgMark, PageTitle, SourceLink } from './shared'

const RESULTS_PER_PAGE = 20

function Results({ report, career }: { report: ShowReport; career: Career }) {
  return <ul className="rows match-results">
    {report.matches.map(match => {
      const sides = matchTeams(match)
      const format = MATCH_FORMAT_LABEL[matchFormat(match)]
      const winner = fighterNames(career, matchWinners(match))
      const finisher = match.tag ? ' de ' + fighterName(career, match.winnerId)
        : match.multi ? ' sobre ' + fighterName(career, match.multi.defeatedId) : ''
      const belt = match.titleId ? TITLES_BY_ID.get(match.titleId) : undefined
      const beltEdition = { date: report.date, unificationMatch: match.id }
      const edition = match.tournamentId ? tournamentEdition(match.tournamentId, career.calendar) : undefined
      return <li className={belt ? "record-row belt-record" : "record-row"} key={match.id}>
        {match.player && !belt && <FighterAvatar name={career.profile.name} look={career.profile.look ?? defaultAppearance()} />}
        {belt && <BeltVisual title={belt} career={career} {...beltEdition} size="thumbnail" />}
        <div className="row-text"><strong>{sides.map(side => fighterNames(career, side)).join(' × ')}</strong>
          <small>{winner} {match.tag ? 'venceram' : 'venceu'} · {METHOD_LABEL[match.method]}{finisher}</small>
          {belt && <small className="belt-label">{beltVisualFor(belt, career, beltEdition).name}</small>}
          {edition && <small className="belt-label">{edition.name} · {roundName(edition, edition.shows.findIndex(event => event.id === report.id))}</small>}
          {(match.tag || match.multi) && match.player && <small>Sua luta</small>}
        </div>
        <span className="chip">{match.tag || match.multi ? format : match.player ? 'Sua luta' : match.titleId ? 'Cinturão' : format}</span>
      </li>
    })}
  </ul>
}

type Period = 'upcoming' | 'announced' | 'completed' | 'archive'
type Layout = 'list' | 'week' | 'month'
const periods: ReadonlyArray<readonly [Period, string]> = [
  ['upcoming', 'Próximos'], ['announced', 'Anunciados'], ['completed', 'Resultados'], ['archive', 'Arquivo real 2026'],
]
const layouts: ReadonlyArray<readonly [Layout, string]> = [['list', 'Lista'], ['week', 'Semana'], ['month', 'Mês']]
const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const dateMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayOfWeek = (date: string) => (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7

function rangeFor(date: string, layout: 'week' | 'month') {
  if (layout === 'week') {
    const start = addDays(date, -dayOfWeek(date))
    return { start, end: addDays(start, 6), title: dateShort(start) + ' a ' + dateShort(addDays(start, 6)) + ' · ' + date.slice(0, 4) }
  }
  const start = date.slice(0, 7) + '-01'
  const next = new Date(start + 'T00:00:00Z')
  next.setUTCMonth(next.getUTCMonth() + 1)
  return { start, end: addDays(next.toISOString().slice(0, 10), -1), title: dateMonth.format(new Date(date + 'T00:00:00Z')) }
}

function ScheduleDayGrid({ layout, date, today, events, nextId, liveId, changeDay }: {
  layout: 'week' | 'month'; date: string; today: string; events: readonly Show[]; nextId?: string; liveId?: string; changeDay: (date: string) => void
}) {
  const { start, end, title } = rangeFor(date, layout)
  const days = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return <section className="panel calendar-grid-panel" aria-label={layout === 'month' ? 'Visão mensal' : 'Visão semanal'}>
    <header className="panel-head calendar-period">
      <button className="icon-button" type="button" onClick={() => changeDay(addDays(start, -1))} disabled={start <= START_DATE}
        aria-label={layout === 'week' ? 'Semana anterior' : 'Mês anterior'}><ChevronLeft size={19} aria-hidden /></button>
      <h2 aria-live="polite">{title}</h2>
      <button className="icon-button" type="button" onClick={() => changeDay(addDays(end, 1))}
        aria-label={layout === 'week' ? 'Semana seguinte' : 'Mês seguinte'}><ChevronRight size={19} aria-hidden /></button>
      <button className="text-button" type="button" onClick={() => changeDay(today)}>Hoje na carreira</button>
    </header>
    <div className="calendar-weekdays" aria-hidden>{weekdays.map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-day-grid">
      {days.map((day, index) => {
        const scheduled = events.filter(show => show.date === day)
        const featured = scheduled.some(show => show.special)
        const player = scheduled.some(show => show.id === nextId || show.id === liveId || 'matches' in show && (show as ShowReport).matches.some(match => match.player))
        const style = index === 0 ? { gridColumnStart: 1 + dayOfWeek(start) } : undefined
        return <button type="button" key={day} style={style} className={'calendar-day' + (player ? ' calendar-day-player' : '')}
          aria-label={dateText(day) + (scheduled.length ? ' · ' + scheduled.length + ' evento(s)' : '')}
          aria-current={day === today ? 'date' : undefined} aria-pressed={day === date} onClick={() => changeDay(day)}>
          <strong>{Number(day.slice(8))}</strong>
          {scheduled.length > 0 && <span className={featured ? 'calendar-day-count special' : 'calendar-day-count'} aria-hidden>{scheduled.length}</span>}
        </button>
      })}
    </div>
  </section>
}

function ReportCard({ report, career, live }: { report: ShowReport; career: Career; live: boolean }) {
  const hasPlayer = report.matches.some(match => match.player)
  const active = live && career.bout?.showId === report.id
  const reference = showReference(report)
  return <details className={'panel report' + (active || hasPlayer ? ' calendar-player-report' : '')}>
    <summary><OrgMark id={report.promotion} small /><div className="row-text"><strong>{report.name}</strong>
      <small>{dateText(report.date)} · {report.matches.length} resultados{active ? ' · sua luta em andamento' : hasPlayer ? ' · sua participação' : ''}</small>
      {reference?.venue && <small>{reference.venue} · {reference.city}</small>}
    </div><ChevronDown size={19} aria-hidden /></summary><Results report={report} career={career} />
  </details>
}

function EventList({ shows, career, nextId }: { shows: readonly Show[]; career: Career | null; nextId?: string }) {
  if (!shows.length) return <EmptyState title="Nenhum evento neste filtro">Selecione outro dia ou outra empresa.</EmptyState>
  return <section className="panel"><ul className="rows">{shows.map(show => {
    const reference = showReference(show)
    const rounds = tournamentSlots(show, career?.calendar).filter(({ edition }) => !career || edition.shows[0].date > career.worldThrough
      || career.tournamentFields.some(field => field.editionId === edition.editionId))
    const stages = [...new Set(rounds.map(({ edition, round }) => edition.name + ' · ' + roundName(edition, round)))]
    const location = [reference?.venue, reference?.city].filter(Boolean).join(' · ')
    const onContract = show.id === nextId
    const sourceLabel = reference?.sourceKind === 'official' ? 'Data oficial' : reference ? 'Data documentada'
      : show.origin === 'announced' ? 'Data anunciada' : 'Agenda simulada'
    return <li className={'event-row calendar-row' + (onContract ? ' calendar-player-report' : '')} key={show.id}>
      <span className="date-stamp">{dateShort(show.date)}</span><div className="row-text">
        <strong>{show.name}</strong>
        <small>{showPromotions(show).map(id => ORGANIZATIONS[id].name).join(' + ')}</small>
        <small>{show.special ? 'Evento especial' : 'Programa ou etapa de turnê'} · {sourceLabel}{reference?.broadcast ? ' · Data de exibição' : ''}</small>
        {location && <small>{location}</small>}
        {onContract && <small className="belt-label">Próximo show do seu contrato</small>}
        {stages.map(stage => <small className="belt-label" key={stage}>{stage + ' · chave simulada'}</small>)}
      </div>{reference && <SourceLink url={reference.source} />}
    </li>
  })}</ul></section>
}

export function Calendar({ career, pending, onAdvance, onFight }: {
  career: Career | null; pending: boolean; onAdvance: (days?: 1 | 7) => void; onFight: () => void
}) {
  const [filter, setFilter] = useState<CircuitFilter>('all')
  const [period, setPeriod] = useState<Period>('upcoming')
  const [layout, setLayout] = useState<Layout>('list')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [resultPage, setResultPage] = useState(0)
  const today = career?.date ?? START_DATE
  const after = career?.worldThrough ?? addDays(START_DATE, -1)
  const date = selectedDay ?? today
  const live = Boolean(career && hasLiveBout(career))
  const next = career?.contract?.status === 'active' ? nextCareerShow(career) : undefined
  const liveShow = live ? career?.shows.find(report => report.id === career.bout?.showId) : undefined
  const accepts = (show: Pick<Show, 'promotion' | 'guestPromotions'>) => filter === 'all' || showPromotions(show).includes(filter)
  const filteredReports = useMemo(() => (career?.shows ?? []).filter(show => filter === 'all' || showPromotions(show).includes(filter)),
    [career?.shows, filter])
  const archive = ARCHIVE_2026.filter(accepts)
  const range = layout === 'list' ? undefined : rangeFor(date, layout)
  const inRange = range ? showsThrough(addDays(range.start, -1), range.end, career?.calendar)
    .filter(show => show.date > after && accepts(show)) : []
  const list = period === 'announced'
    ? showsThrough(after, '2026-12-31', career?.calendar).filter(show => show.origin !== 'generated' && accepts(show))
    : period === 'upcoming' && layout === 'list' ? upcomingShows(after, 6, career?.calendar).filter(accepts) : []
  const pageCount = Math.ceil(filteredReports.length / RESULTS_PER_PAGE)
  const currentPage = Math.min(resultPage, Math.max(0, pageCount - 1))
  const latestReports = filteredReports.slice().reverse().slice(currentPage * RESULTS_PER_PAGE, (currentPage + 1) * RESULTS_PER_PAGE)
  const visibleReports = range ? filteredReports.filter(show => show.date >= range.start && show.date <= range.end) : []
  const reportsForDay = visibleReports.filter(show => show.date === date)
  const dateEvents = inRange.filter(show => show.date === date)
  return <>
    <PageTitle title="Calendário" intro={dateText(today)}
      action={career && <button className="button primary" disabled={pending} onClick={live ? onFight : () => onAdvance()}>
        {live ? 'Entrar no combate' : 'Avançar calendário'} <ArrowRight size={17} aria-hidden />
      </button>} />
    {career && !live && <div className="calendar-advance">
      <button className="button secondary" disabled={pending} onClick={() => onAdvance(1)}>Avançar 1 dia</button>
      <button className="button secondary" disabled={pending} onClick={() => onAdvance(7)}>Avançar até 1 semana</button>
      {next && <span>Próximo show do seu contrato · {next.name} · {dateText(next.date)}</span>}
    </div>}
    {career && liveShow && career.bout && <div className="inline-note"><Swords size={18} aria-hidden /><span>
      Você está escalado em {liveShow.name} · {pendingUnificationBout(career) ? 'Luta de unificação' : career.bout.multi ? 'Contra ' + fighterNames(career, career.bout.multi.opponents.map(opponent => opponent.id)) : 'Contra ' + fighterName(career, career.bout.rivalId)}
    </span></div>}
    {career?.calendar === 'legacy' && period === 'upcoming' && <p className="calendar-legacy">Esta carreira usa o calendário da versão em que começou. As datas verificadas estão em Arquivo real 2026.</p>}
    <div className="filter-bar">
      <div className="segmented" role="group" aria-label="Tipo de agenda">
        {periods.map(([value, label]) => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
      </div>
      <CircuitSelect value={filter} onChange={value => { setFilter(value); setResultPage(0) }} />
    </div>
    {period === 'upcoming' && <div className="segmented calendar-layout" role="group" aria-label="Visualização do calendário">
      {layouts.map(([value, label]) => <button key={value} aria-pressed={layout === value} onClick={() => setLayout(value)}>{label}</button>)}
    </div>}
    {period === 'upcoming' && layout !== 'list' ? <>
      <ScheduleDayGrid layout={layout} date={date} today={today} changeDay={setSelectedDay} events={[...inRange, ...visibleReports]}
        nextId={next?.id} liveId={liveShow?.id} />
      <section className="calendar-selected" aria-label="Eventos do dia selecionado">
        <h2>{dateText(date)}</h2>
        {career && reportsForDay.length ? <div className="stack">{reportsForDay.map(report => <ReportCard key={report.id} report={report} career={career} live={live} />)}</div>
          : <EventList shows={dateEvents} career={career} nextId={next?.id} />}
      </section>
    </> : (period === 'upcoming' || period === 'announced') && <EventList shows={list} career={career} nextId={next?.id} />}
    {period === 'completed' && (career && latestReports.length ? <div className="stack">
      {pageCount > 1 && <nav className="result-pagination" aria-label="Páginas de resultados">
        <button type="button" className="button secondary" disabled={currentPage === 0}
          onClick={() => setResultPage(currentPage - 1)}>Página anterior</button>
        <span aria-live="polite">Página {currentPage + 1} de {pageCount}</span>
        <button type="button" className="button secondary" disabled={currentPage >= pageCount - 1}
          onClick={() => setResultPage(currentPage + 1)}>Próxima página</button>
      </nav>}
      {latestReports.map(report => <ReportCard key={report.id} report={report} career={career} live={live} />)}
    </div> : <EmptyState title="Nenhum resultado neste filtro">Os cards aparecem aqui depois de simulados.</EmptyState>)}
    {period === 'archive' && <section className="panel">
      <header className="panel-head"><div><h2>Eventos reais de 2026</h2><p>Datas verificadas e locais publicados. Os cards da carreira são simulados.</p></div></header>
      <ul className="rows">{archive.map(show => <li className="event-row calendar-row" key={show.promotion + show.date + show.name}>
        <span className="date-stamp">{dateShort(show.date)}</span><div className="row-text"><strong>{show.name}</strong>
          <small>{ORGANIZATIONS[show.promotion].name} · {show.sourceKind === 'official' ? 'Data oficial' : 'Data documentada'}
            {show.broadcast ? ' · Data de exibição' : ''}</small>
          {(show.venue || show.city) && <small>{[show.venue, show.city].filter(Boolean).join(' · ')}</small>}
        </div><SourceLink url={show.source} />
      </li>)}</ul>
    </section>}
  </>
}
