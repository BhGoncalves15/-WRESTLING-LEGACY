import { useEffect, useId, useMemo, useState } from 'react'
import { cityId, countries, flagsUrl, makePlace, placesFor, regionId, regionLabel, type Country, type CountryPlaces } from '../content/geography'
import { searchKey, type Place } from '../domain/geography'

export type LocationDraft = { countryCode: string; regionId: string; cityId: string; manualCity: string; manual: boolean }
export const openingLocation = (): LocationDraft => ({ countryCode: 'BR', regionId: '', cityId: '', manualCity: '', manual: false })

const sorted = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })

export function useGeography(code: string) {
  const [index, setIndex] = useState<Country[]>([])
  const [catalog, setCatalog] = useState<{ code: string; data: CountryPlaces } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const country = index.find(row => row[0] === code)
  useEffect(() => {
    let active = true
    countries().then(rows => { if (active) setIndex(rows) }, () => { if (active) setFailed('*') })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    if (!country) return
    let active = true
    placesFor(country).then(data => { if (active) setCatalog({ code: country[0], data }) }, () => { if (active) setFailed(country[0]) })
    return () => { active = false }
  }, [country, attempt])
  return { index, country, catalog: catalog?.code === code ? catalog.data : undefined, error: failed === '*' || failed === code,
    retry: () => { setFailed(null); setAttempt(attempt + 1) } }
}

export function selectedPlace(draft: LocationDraft, catalog: CountryPlaces | undefined): Place | undefined {
  if (!catalog || (!draft.cityId && !draft.manual)) return undefined
  try {
    return makePlace(draft.countryCode, catalog, draft.regionId, draft.cityId, draft.manualCity)
  } catch {
    return undefined
  }
}

function Flag({ index }: { index: number }) {
  return <span className="country-flag" aria-hidden="true" style={{
    backgroundImage: 'url(' + flagsUrl + ')', backgroundPosition: `-${(index % 16) * 24}px -${Math.floor(index / 16) * 18}px`,
  }} />
}

function CountryPicker({ index, country, onCountry }: {
  index: Country[]; country: Country | undefined; onCountry: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const id = useId()
  const list = useMemo(() => index.map((row, flag) => ({ row, flag })).sort((a, b) => sorted(a.row[1], b.row[1])), [index])
  const visible = list.filter(({ row }) => row.slice(0, 3).some(name => searchKey(String(name)).includes(searchKey(query))))

  function choose(code: string) {
    setOpen(false)
    setQuery('')
    setActive(-1)
    onCountry(code)
  }

  return <div className="country-picker">
    <label htmlFor={id}>País</label>
    <div className="country-input">
      {country && <Flag index={index.indexOf(country)} />}
      <input id={id} type="text" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={id + '-list'} aria-activedescendant={open && active >= 0 ? id + '-' + active : undefined}
        disabled={!index.length} placeholder={open ? 'Buscar país' : undefined} value={open ? query : country?.[1] ?? ''}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => { setOpen(false); setQuery(''); setActive(-1) }}
        onChange={event => { setOpen(true); setQuery(event.target.value); setActive(-1) }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setOpen(false)
            setQuery('')
            setActive(-1)
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            if (!visible.length) return
            const next = active === -1 ? (event.key === 'ArrowDown' ? 0 : visible.length - 1)
              : (active + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length
            setActive(next)
            requestAnimationFrame(() => document.getElementById(id + '-' + next)?.scrollIntoView({ block: 'nearest' }))
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault()
            const option = visible[active === -1 ? 0 : active]
            if (option) choose(option.row[0])
          }
        }} />
    </div>
    <div className="country-results" hidden={!open}>
      <ul id={id + '-list'} role="listbox" aria-label="Países e territórios" className="rows">
        {visible.map(({ row, flag }, index) => <li id={id + '-' + index} key={row[0]} role="option"
          aria-selected={row === country} className={active === index ? 'highlighted' : undefined}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(row[0])}>
          <Flag index={flag} /> <span>{row[1]}</span>
        </li>)}
      </ul>
      {!visible.length && <p role="status">Nenhum país encontrado.</p>}
    </div>
  </div>
}

export function GeographyPicker({ value, change, geography }: {
  value: LocationDraft; change: (next: LocationDraft) => void; geography: ReturnType<typeof useGeography>
}) {
  const fieldId = useId()
  const [cityQuery, setCityQuery] = useState('')
  const { index, country, catalog, error, retry } = geography
  const divisionLabel = regionLabel(value.countryCode, catalog?.[0] ?? [])
  const regions = useMemo(() => [...(catalog?.[0] ?? [])].sort((a, b) => sorted(a[1], b[1])), [catalog])
  const region = regions.find(row => regionId(value.countryCode, row) === value.regionId)
  const cities = useMemo(() => [...(region?.[3] ?? catalog?.[1] ?? [])].sort((a, b) => sorted(a[1], b[1])), [region, catalog])
  const results = cities.filter(city => searchKey(city[1]).includes(searchKey(cityQuery)))
  const visibleCities = results.slice(0, 80)
  const chosen = cities.find(city => cityId(value.countryCode, region, city) === value.cityId)
  if (chosen && !visibleCities.includes(chosen)) visibleCities.unshift(chosen)

  function selectCountry(code: string) {
    setCityQuery('')
    change({ ...openingLocation(), countryCode: code })
  }
  function selectRegion(id: string) {
    setCityQuery('')
    change({ ...value, regionId: id, cityId: '', manualCity: '', manual: false })
  }
  return <fieldset className="geography-picker">
    <legend>Origem do lutador</legend>
    {error && <div className="inline-note" role="status"><span>Não foi possível carregar as localidades.</span>
      <button type="button" className="button secondary" onClick={retry}>Tentar novamente</button></div>}
    <div className="geography-fields">
      <CountryPicker index={index} country={country} onCountry={selectCountry} />
      <div className="geography-field">
        {regions.length > 0 && <div className="field">
          <label htmlFor={fieldId + '-region'}>{divisionLabel}</label>
          <select id={fieldId + '-region'} value={value.regionId} onChange={event => selectRegion(event.target.value)}>
            <option value="">{catalog?.[1].length ? 'Sem divisão cadastrada' : 'Selecione'}</option>
            {regions.map(row => <option value={regionId(value.countryCode, row)} key={row[0]}>{row[1]}</option>)}
          </select>
        </div>}
        {country && !catalog && !error && <small role="status">Carregando localidades de {country[1]}…</small>}
        {catalog && !regions.length && <small>O catálogo não lista subdivisões para esta origem.</small>}
      </div>
      <div className="geography-field">
        {!value.manual && <>
          <label>Buscar cidade <input type="search" value={cityQuery} disabled={!cities.length}
            onChange={event => setCityQuery(event.target.value)} /></label>
          <div className="field">
            <label htmlFor={fieldId + '-city'}>Cidade</label>
            <select id={fieldId + '-city'} value={value.cityId} disabled={!cities.length}
              onChange={event => change({ ...value, cityId: event.target.value })}>
              <option value="">Selecione</option>
              {visibleCities.map(city => <option value={cityId(value.countryCode, region, city)} key={city[0]}>{city[1]}</option>)}
            </select>
          </div>
          {results.length > 80 && <small>Mostrando 80 de {results.length}. Digite o nome para refinar.</small>}
        </>}
        {value.manual && <label>Cidade fora do catálogo <input value={value.manualCity} maxLength={100}
          onChange={event => change({ ...value, manualCity: event.target.value })} /></label>}
        {catalog && (region || !regions.length) && <button type="button" className="text-button" onClick={() => change({
          ...value, manual: !value.manual, cityId: '', manualCity: '',
        })}>{value.manual ? 'Escolher cidade do catálogo' : 'Minha cidade não está na lista'}</button>}
      </div>
    </div>
  </fieldset>
}
