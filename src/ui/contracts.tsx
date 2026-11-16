import { ArrowRight, BadgeCheck, Banknote, Clock3 } from 'lucide-react'
import { useState } from 'react'
import { ORGANIZATIONS } from '../content/catalog'
import { defaultAppearance } from '../domain/appearance'
import type { Career, Offer } from '../domain/model'
import { balanceFor } from '../engine/career'
import { FighterAvatar } from './avatar'
import { dateText, EmptyState, money, OrgMark, PageTitle } from './shared'

function OfferCard({ offer, pending, renewal, onSign, onDecline, onNegotiate }: {
  offer: Offer; pending: boolean; renewal: boolean; onSign: () => void; onDecline: () => void; onNegotiate: (pay: number) => void
}) {
  const [raise, setRaise] = useState(10)
  const organization = ORGANIZATIONS[offer.promotion]
  const available = offer.status === 'available'
  return <article className="panel offer">
    <div className="offer-company"><OrgMark id={offer.promotion} /><div><h2>{organization.name}</h2><p>{renewal ? 'Proposta de renovação' : organization.home}</p></div></div>
    <dl className="terms">
      <div><dt>Por show disputado</dt><dd>{money(offer.pay)}</dd></div>
      <div><dt>Bônus por vitória</dt><dd>{money(offer.winBonus)}</dd></div>
      <div><dt>Duração</dt><dd>{offer.weeks} semanas</dd></div>
    </dl>
    {!available ? <p className="status-pill muted">Proposta recusada</p> : <>
      {offer.response === 'pending' ? <details className="negotiation">
        <summary>Negociar pagamento</summary>
        <form onSubmit={event => { event.preventDefault(); onNegotiate(Math.round(offer.pay * (1 + raise / 100))) }}>
          <label>Aumento solicitado<select value={raise} onChange={event => setRaise(Number(event.target.value))}>
            {[5, 10, 20, 30].map(value => <option key={value} value={value}>+{value}%</option>)}</select></label>
          <button className="button secondary" disabled={pending}>Enviar contraproposta</button>
        </form>
      </details> : <p className={'status-pill ' + (offer.response === 'accepted' ? 'positive' : 'muted')}>
        {offer.response === 'accepted' ? 'Contraproposta aceita' : 'Proposta original mantida'}
      </p>}
      <div className="offer-actions">
        <button className="button primary" onClick={onSign} disabled={pending}>{renewal ? 'Renovar com' : 'Assinar com'} {organization.initials} <ArrowRight size={17} aria-hidden /></button>
        <button className="button quiet" onClick={onDecline} disabled={pending}>Recusar</button>
      </div>
    </>}
  </article>
}

export function Contracts({ career, pending, onSign, onDecline, onNegotiate, onRefresh, onCalendar }: {
  career: Career; pending: boolean; onSign: (id: string) => void; onDecline: (id: string) => void;
  onNegotiate: (id: string, pay: number) => void; onRefresh: () => void; onCalendar: () => void
}) {
  const contract = career.contract
  const active = contract?.status === 'active'
  return <>
    <PageTitle title="Contratos" intro={active ? 'Vínculo profissional e pagamentos da carreira.' : 'Escolha a empresa em que você vai lutar.'} />
    <div className="identity-strip"><FighterAvatar name={career.profile.name} look={career.profile.look ?? defaultAppearance()} />
      <div className="row-text"><strong>{career.profile.name}</strong><small>{career.profile.style} · {career.profile.alignment}</small></div>
    </div>
    {active ? <section className="panel current-contract">
      <div className="offer-company"><OrgMark id={contract.promotion} /><div>
        <h2>{ORGANIZATIONS[contract.promotion].name}</h2><p><BadgeCheck size={16} aria-hidden /> Contrato ativo</p>
      </div></div>
      <dl className="terms wide">
        <div><dt>Por show disputado</dt><dd>{money(contract.pay)}</dd></div>
        <div><dt>Bônus por vitória</dt><dd>{money(contract.winBonus)}</dd></div>
        <div><dt>Início</dt><dd>{dateText(contract.start)}</dd></div>
        <div><dt>Término</dt><dd>{dateText(contract.end)}</dd></div>
      </dl>
      <button className="button primary" onClick={onCalendar}>Ver calendário <ArrowRight size={17} aria-hidden /></button>
    </section> : career.offers.length ? <div className="offer-grid">
      {career.offers.map(offer => <OfferCard key={offer.id} offer={offer} pending={pending} renewal={contract?.status === 'expired' && contract.promotion === offer.promotion}
        onSign={() => onSign(offer.id)} onDecline={() => onDecline(offer.id)} onNegotiate={pay => onNegotiate(offer.id, pay)} />)}
    </div> : <EmptyState title="Mercado de contratos">As ofertas disponíveis aparecem aqui.</EmptyState>}
    {!active && career.offers.every(offer => offer.status === 'declined') && <div className="inline-note">
      <Clock3 size={18} aria-hidden /><span>O mercado responde após uma semana simulada.</span>
      <button className="button secondary" onClick={onRefresh} disabled={pending}>Solicitar novas propostas</button>
    </div>}
    {career.ledger.length > 0 && <section className="panel finance">
      <header className="panel-head"><h2><Banknote size={19} aria-hidden /> Pagamentos</h2><strong>{money(balanceFor(career))}</strong></header>
      <ul className="rows">{[...career.ledger].reverse().map(item => <li className="record-row" key={item.id}>
        <div className="row-text"><strong>{item.label}</strong><small>{dateText(item.date)}</small></div><strong>{money(item.amount)}</strong>
      </li>)}</ul>
    </section>}
  </>
}
