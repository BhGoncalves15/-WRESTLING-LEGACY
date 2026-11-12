import { ChevronDown, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ORGANIZATIONS } from '../content/catalog'
import { FIRST_SEASON, editionsForSeason, seasonOf, type TournamentEdition } from '../content/tournaments'
import { DIVISION_LABEL, DIVISIONS, PROMOTIONS, type Career, type Division, type PromotionId, type ShowReport } from '../domain/model'
import { PLAYER_ID, fighterName, fighterNames } from '../engine/career'
import { CONTENDER_LIMIT, RANKING_DAYS, TOURNAMENT_BONUS, WIN_POINTS, rankingsFor } from '../engine/rankings'
import { rivalryExpired, rivalryStates } from '../engine/rivalries'
import { fighterDivision } from '../engine/titles'
import { tournamentEntryIssue, tournamentProgress } from '../engine/tournaments'
import { EmptyState, OrgMark, PageTitle, SourceLink, dateShort, dateText } from './shared'

type Circuit = { career: Career; promotion: PromotionId; division: Division }

type TableRow = {
  fighterId: string
  wins: number
  losses: number
  points: number
  position?: number | null
}

function ScoreTable({ career, caption, rows, rankings = false }: {
  career: Career; caption: string; rows: readonly TableRow[]; rankings?: boolean
}) {
  return <table className="score-table">
    <caption className="sr-only">{caption}</caption>
    <thead><tr>
      {rankings && <th scope="col"><abbr title="Posição">Pos.</abbr></th>}
      <th scope="col">Lutador</th>
      <th scope="col"><abbr title="Vitórias">V</abbr></th>
      <th scope="col"><abbr title="Derrotas">D</abbr></th>
      <th scope="col"><abbr title="Pontos">Pts</abbr></th>
    </tr></thead>
    <tbody>{rows.map(row => <tr key={row.fighterId} className={row.fighterId === PLAYER_ID ? 'your-standing' : undefined}>
      {rankings && <td>{row.position ?? <span aria-label="Sem classificação">—</span>}</td>}
      <th scope="row">{fighterName(career, row.fighterId)}{row.fighterId === PLAYER_ID && <small className="your-label">Você</small>}</th>
      <td>{row.wins}</td><td>{row.losses}</td><td>{row.points}</td>
    </tr>)}</tbody>
  </table>
}

function Rankings({ career, promotion, division }: Circuit) {
  const rows = useMemo(() => rankingsFor(career, promotion, division), [career, promotion, division])
  const org = ORGANIZATIONS[promotion].name
  return <section className="panel">
    <header className="panel-head"><div>
      <h2>{org}</h2><p>Lutas individuais nos últimos {RANKING_DAYS} dias. Cada vitória vale {WIN_POINTS} pontos. Vitórias em torneios valem {WIN_POINTS + TOURNAMENT_BONUS}.</p>
      <p>Para desafiar por um cinturão individual, alcance o top {CONTENDER_LIMIT}, três vitórias individuais na carreira e 18 de popularidade.</p>
    </div><OrgMark id={promotion} small /></header>
    {rows.length ? <ScoreTable career={career} caption={'Ranking individual · ' + org} rows={rows} rankings />
      : <p className="empty-line">O elenco deste circuito ainda não tem lutadores nesta divisão.</p>}
  </section>
}

function Rivalries({ career, promotion, division }: Circuit) {
  const [onlyMine, setOnlyMine] = useState(false)
  const [limit, setLimit] = useState(20)
  const series = useMemo(() => [...rivalryStates(career.shows).values()].filter(item => (
    item.active && item.promotion === promotion && fighterDivision(career, item.fighters[0]) === division
  )).map(item => ({
    ...item, status: item.winnerId ? 'Encerrada' : rivalryExpired(item, career.date) ? 'Esfriou' : 'Em disputa',
  })).sort((a, b) => Number(b.status === 'Em disputa') - Number(a.status === 'Em disputa')
    || b.lastMeeting.localeCompare(a.lastMeeting)), [career.shows, career.date, career.profile.division, promotion, division])
  const visible = onlyMine ? series.filter(item => item.fighters.includes(PLAYER_ID)) : series
  return <section className="panel">
    <header className="panel-head rivalry-header"><div><h2>Séries de rivalidade</h2>
      <p>Em Singles, uma disputa de cinturão ou uma vitória de cada lado pode abrir uma série. Duas vitórias decidem a série.</p></div>
      <button className="button secondary small-button" aria-pressed={onlyMine} onClick={() => { setOnlyMine(!onlyMine); setLimit(20) }}>
        {onlyMine ? 'Mostrar todas' : 'Só minhas rivalidades'}
      </button>
    </header>
    {visible.length ? <ul className="rows">{visible.slice(0, limit).map(item => <li className="record-row rivalry-row" key={item.fighters.join('+')}>
      <div className="row-text"><strong>{fighterNames(career, item.fighters)}</strong>
        <small>Último confronto · {dateText(item.lastMeeting)}</small>
        {item.winnerId && <small className="belt-label">{fighterName(career, item.winnerId)} venceu a série</small>}
      </div>
      <span className="series-score" aria-label={item.wins.join(' a ')}>{item.wins.join('–')}</span>
      <span className={'chip' + (item.status === 'Em disputa' ? ' competition-live' : '')}>{item.status}</span>
    </li>)}</ul> : <p className="empty-line">Nenhuma rivalidade registrada neste filtro.</p>}
    {visible.length > limit && <div className="form-footer"><button className="button secondary" onClick={() => setLimit(limit + 20)}>Ver mais</button></div>}
  </section>
}

function TournamentCard({ career, edition, reports, pending, onEntry }: {
  career: Career; edition: TournamentEdition; reports: ReadonlyMap<string, ShowReport>; pending: boolean; onEntry: (id: string, enter: boolean) => void
}) {
  const field = career.tournamentFields.find(item => item.editionId === edition.editionId)
  const { rounds, winnerId, groups } = tournamentProgress(edition, field, reports)
  const enrolled = career.tournamentEntries.includes(edition.editionId)
  const upcoming = edition.shows[0].date > career.worldThrough
  const issue = tournamentEntryIssue(career, edition)
  const participates = field?.seeds.includes(PLAYER_ID)
  const status = winnerId ? 'Encerrado' : field ? 'Em andamento' : enrolled ? 'Inscrição confirmada' : upcoming ? 'Agendado' : 'Edição indisponível'
  const finalDate = dateShort(edition.shows.at(-1)!.date)
  return <details className="panel report tournament-card">
    <summary>
      <OrgMark id={edition.promotion} small />
      <span className="row-text"><strong>{edition.name}</strong>
        <small>{winnerId ? 'Vencedor · ' + fighterName(career, winnerId) : dateShort(edition.shows[0].date) + ' – ' + finalDate}</small>
      </span>
      <span className={'chip' + (enrolled || (field && !winnerId) ? ' competition-live' : '')}>{status}</span>
      <ChevronDown size={18} aria-hidden />
    </summary>
    <div className="tournament-body">
      <div className="tournament-meta">
        <div>
          <strong>{edition.format === 'groups' ? 'Grupos e final' : 'Eliminatórias'}</strong>
          <p>{edition.format === 'groups'
            ? 'Dois grupos de três. Cada vitória vale ' + edition.winPoints + ' pontos. O líder de cada grupo vai à final. Desempates por confronto direto entre os empatados e ordem de entrada.'
            : 'Quatro participantes. Os vencedores das semifinais disputam a final.'}</p>
          {edition.source && <small>Formato adaptado para a simulação.</small>}
        </div>
        {edition.source && <SourceLink url={edition.source} />}
      </div>
      {upcoming && (!issue || career.contract?.promotion === edition.promotion) && <div className="tournament-entry">
        {!issue ? <>
          <p>{enrolled ? 'Sua vaga está reservada.' : 'Reserve sua vaga antes de avançar para ' + dateText(edition.shows[0].date) + '.'}</p>
          <button className={'button ' + (enrolled ? 'secondary' : 'primary')} disabled={pending}
            onClick={() => onEntry(edition.editionId, !enrolled)}>{enrolled ? 'Cancelar inscrição' : 'Inscrever-se'}</button>
        </> : <p>{issue}</p>}
      </div>}
      {participates && <div className="tournament-entry"><Trophy size={18} aria-hidden /><p>{winnerId === PLAYER_ID
        ? 'Você conquistou esta edição.' : 'Você faz parte desta chave.'}</p></div>}
      {groups.length > 0 && <div className="tournament-grid">
        {groups.map(group => <section className="tournament-group" key={group.name}>
          <h3>{group.name}</h3><ScoreTable career={career} caption={group.name} rows={group.rows} />
        </section>)}
      </div>}
      {(field || upcoming) && <ol className={'tournament-rounds' + (edition.format === 'knockout' ? ' bracket' : '')} role="list" aria-label="Rodadas do torneio">
        {rounds.map(({ show, name, result, fighters }) => <li className="tournament-round" key={show.id}>
          <div className="round-date"><strong>{name}</strong><time dateTime={show.date}>{dateShort(show.date)}</time></div>
          <strong>{fighters ? fighters.map(id => fighterName(career, id)).join(' × ') : 'Participantes a definir'}</strong>
          <small>{result ? 'Vitória de ' + fighterName(career, result.winnerId) : show.name}</small>
        </li>)}
      </ol>}
      {!field && !upcoming && <p>O calendário deste save já havia passado pela abertura desta edição.</p>}
    </div>
  </details>
}

function Tournaments({ career, promotion, division, pending, onEntry }: Circuit & {
  pending: boolean; onEntry: (id: string, enter: boolean) => void
}) {
  const currentYear = seasonOf(career.date)
  const [year, setYear] = useState(currentYear)
  const reports = useMemo(() => new Map(career.shows.map(report => [report.id, report])), [career.shows])
  const editions = editionsForSeason(year).filter(edition => edition.promotion === promotion && edition.division === division)
  const years = Array.from({ length: currentYear - FIRST_SEASON + 2 }, (_, index) => FIRST_SEASON + index)
  return <>
    <div className="filter-bar season-filter"><label>Temporada<select value={year} onChange={event => setYear(Number(event.target.value))}>
      {years.map(season => <option key={season}>{season}</option>)}
    </select></label></div>
    {editions.length ? <div className="stack">{editions.map(edition => <TournamentCard key={edition.editionId} career={career}
      edition={edition} reports={reports} pending={pending} onEntry={onEntry} />)}</div>
      : <EmptyState title="Sem torneios neste filtro">Consulte os outros circuitos e divisões.</EmptyState>}
  </>
}

const views = [['rankings', 'Rankings'], ['rivalries', 'Rivalidades'], ['tournaments', 'Torneios']] as const

export default function Competitions({ career, pending, onEntry }: {
  career: Career; pending: boolean; onEntry: (id: string, enter: boolean) => void
}) {
  const [view, setView] = useState<typeof views[number][0]>('rankings')
  const [promotion, setPromotion] = useState<PromotionId>(career.contract?.promotion ?? 'nxt')
  const [division, setDivision] = useState<Division>(career.profile.division)
  const circuit = { career, promotion, division }
  return <>
    <PageTitle title="Competições" />
    <div className="filter-bar competition-tools">
      <div className="segmented" role="group" aria-label="Página de competições">
        {views.map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
      </div>
      <div className="competition-filters">
        <label>Empresa ou brand<select value={promotion} onChange={event => setPromotion(event.target.value as PromotionId)}>
          {PROMOTIONS.map(id => <option value={id} key={id}>{ORGANIZATIONS[id].name}</option>)}
        </select></label>
        <label>Divisão<select value={division} onChange={event => setDivision(event.target.value as Division)}>
          {DIVISIONS.map(id => <option value={id} key={id}>{DIVISION_LABEL[id]}</option>)}
        </select></label>
      </div>
    </div>
    {view === 'rankings' && <Rankings {...circuit} />}
    {view === 'rivalries' && <Rivalries key={promotion + division} {...circuit} />}
    {view === 'tournaments' && <Tournaments {...circuit} pending={pending} onEntry={onEntry} />}
  </>
}
