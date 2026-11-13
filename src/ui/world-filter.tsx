import { ORGANIZATIONS } from '../content/catalog'
import { PROMOTIONS, type PromotionId } from '../domain/model'

export type CircuitFilter = PromotionId | 'all'

export function CircuitSelect({ value, onChange }: { value: CircuitFilter; onChange: (value: CircuitFilter) => void }) {
  return <label>Empresa ou brand<select value={value} onChange={event => onChange(event.target.value as CircuitFilter)}>
    <option value="all">Todas</option>{PROMOTIONS.map(id => <option value={id} key={id}>{ORGANIZATIONS[id].name}</option>)}
  </select></label>
}
