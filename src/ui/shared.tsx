import { CalendarDays, ChevronRight, ExternalLink, Swords } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { ORGANIZATIONS } from '../content/catalog'
import type { PromotionId, Show } from '../domain/model'

const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
export const dateText = (date: string) => fullDate.format(new Date(date + 'T00:00:00Z'))
export const dateShort = (date: string) => shortDate.format(new Date(date + 'T00:00:00Z')).replace(' de ', ' ').replace('.', '')
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value) + ' $'

export function PageTitle({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return <div className="page-title"><div><h1>{title}</h1>{intro && <p>{intro}</p>}</div>{action}</div>
}

export function OrgMark({ id, small = false }: { id: PromotionId; small?: boolean }) {
  const org = ORGANIZATIONS[id]
  return <span aria-hidden className={'org-mark' + (small ? ' small' : '')} style={{ '--org-accent': org.accent } as CSSProperties}>{org.initials}</span>
}

export function SourceLink({ url }: { url: string }) {
  return <a className="source-link" href={url} target="_blank" rel="noreferrer">Fonte <ExternalLink size={13} aria-hidden /></a>
}

export function Meter({ label, value, variant = '' }: { label: string; value: number; variant?: string }) {
  return <div className={'meter ' + variant}>
    <div className="meter-label"><span>{label}</span><strong>{Math.round(value)}</strong></div>
    <div className="meter-track" role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: value + '%' }} />
    </div>
  </div>
}

export function UpcomingList({ shows, onCalendar }: { shows: Show[]; onCalendar?: () => void }) {
  return <section className="panel">
    <header className="panel-head"><h2><CalendarDays size={20} aria-hidden /> Próximos eventos</h2>
      {onCalendar && <button className="text-button" onClick={onCalendar}>Calendário <ChevronRight size={16} aria-hidden /></button>}
    </header>
    {shows.length ? <ul className="rows">{shows.map(show => <li key={show.id} className="event-row">
      <span className="date-stamp">{dateShort(show.date)}</span>
      <div className="row-text"><strong>{show.name}</strong><small>{ORGANIZATIONS[show.promotion].name}</small></div>
      {show.special && <span className="chip">Especial</span>}
    </li>)}</ul> : <p className="empty-line">O próximo card aparece quando o calendário avançar.</p>}
  </section>
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="panel empty-state"><Swords size={26} aria-hidden /><h2>{title}</h2><p>{children}</p>{action}</section>
}
