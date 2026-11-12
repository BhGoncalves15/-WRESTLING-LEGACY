import {
  AlertCircle, ArrowRight, Building2, CalendarDays, Check, CircleUserRound, Handshake, History,
  LayoutDashboard, Menu, Newspaper, Plus, Save, Settings2, Swords, Trophy, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DIFFICULTIES, START_DATE, type Career, type Difficulty, type Profile } from '../domain/model'
import {
  advanceCareer, declineOffer, hasLiveBout, improveAttribute, improveMove, negotiate, newCareer,
  renewOffers, resolvePlayerTurn, setDifficulty, signOffer,
} from '../engine/career'
import { createSave, listSaves, openSave, saveCareer, type Vault } from '../storage/indexed-db'
import { exportCareer, importCareer } from '../storage/save-format'
import { Contracts } from './contracts'
import { Creator } from './creator'
import { Fight } from './fight'
import { Player } from './player'
import { Saves, Settings } from './saves'
import { dateText } from './shared'
import { Calendar, Championships, Companies, Feed, Home } from './world'

const NAVIGATION = [
  { route: 'inicio', label: 'Visão geral', icon: LayoutDashboard },
  { route: 'lutador', label: 'Meu lutador', icon: CircleUserRound, careerOnly: true },
  { route: 'calendario', label: 'Calendário', icon: CalendarDays },
  { route: 'combates', label: 'Combates', icon: Swords, careerOnly: true },
  { route: 'contratos', label: 'Contratos', icon: Handshake, careerOnly: true },
  { route: 'empresas', label: 'Empresas', icon: Building2 },
  { route: 'campeonatos', label: 'Campeonatos', icon: Trophy },
  { route: 'noticias', label: 'Notícias', icon: Newspaper, careerOnly: true },
  { route: 'historico', label: 'Histórico', icon: History, careerOnly: true },
  { route: 'configuracoes', label: 'Configurações', icon: Settings2 },
  { route: 'salvamentos', label: 'Salvamentos', icon: Save },
] as const

type Route = typeof NAVIGATION[number]['route'] | 'nova-carreira'
const LAST_CAREER = 'wrestling-legacy:last-career'
const DEFAULT_DIFFICULTY = 'wrestling-legacy:difficulty'

function browserValue(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function remember(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* IndexedDB remains the source of the career. */ }
}

function currentRoute(): Route {
  const path = location.hash.replace(/^#\/?/, '')
  if (path === 'nova-carreira' || NAVIGATION.some(item => item.route === path)) return path as Route
  return 'inicio'
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir esta ação.'

export function App() {
  const [requested, setRoute] = useState<Route>(currentRoute)
  const [vault, setVault] = useState<Vault>({ entries: [], damaged: 0 })
  const [career, setCareer] = useState<Career | null>(null)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>(() => {
    const value = browserValue(DEFAULT_DIFFICULTY)
    return DIFFICULTIES.find(difficulty => difficulty === value) ?? 'normal'
  })
  const locked = useRef(false)
  const main = useRef<HTMLElement>(null)

  useEffect(() => {
    const sync = () => { setRoute(currentRoute()); setMenu(false) }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const entries = await listSaves()
        if (!active) return
        setVault(entries)
        const last = browserValue(LAST_CAREER)
        if (last && entries.entries.some(entry => entry.career.id === last)) {
          const opened = await openSave(last)
          if (!active) return
          setCareer(opened.career)
          if (opened.recovered) {
            setVault(await listSaves())
            if (active) setNotice({ text: 'A revisão anterior da carreira foi recuperada.', error: false })
          }
        }
      } catch (error) {
        if (active) setNotice({ text: errorMessage(error), error: true })
      } finally {
        if (active) setReady(true)
      }
    }
    void restore()
    return () => { active = false }
  }, [])

  const route: Route = !career && NAVIGATION.some(item => item.route === requested && 'careerOnly' in item) ? 'salvamentos' : requested
  const title = route === 'nova-carreira' ? 'Nova carreira' : NAVIGATION.find(item => item.route === route)?.label
  const nav = NAVIGATION.filter(item => career || !('careerOnly' in item))

  function navigate(target: Route) {
    if (location.hash !== '#/' + target) location.hash = '/' + target
    setRoute(target)
    setMenu(false)
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }

  async function operation(work: () => Promise<void>) {
    if (locked.current || !ready) return
    locked.current = true
    setPending(true)
    setNotice(null)
    try {
      await work()
    } catch (error) {
      setNotice({ text: errorMessage(error), error: true })
    } finally {
      locked.current = false
      setPending(false)
    }
  }

  function activate(saved: Career) {
    setCareer(saved)
    remember(LAST_CAREER, saved.id)
    setVault(previous => {
      const others = previous.entries.filter(entry => entry.career.id !== saved.id)
      const entries = [...others, { career: saved, recoveryAvailable: false }]
      return { ...previous, entries: entries.sort((a, b) => b.career.createdAt - a.career.createdAt) }
    })
  }

  function change(update: (current: Career) => Career, after?: (saved: Career) => void) {
    void operation(async () => {
      if (!career) return
      const saved = await saveCareer(update(career))
      activate(saved)
      after?.(saved)
    })
  }

  function create(profile: Profile, difficulty: Difficulty) {
    void operation(async () => {
      activate(await createSave(newCareer(profile, difficulty)))
      navigate('contratos')
    })
  }

  function resume(id: string) {
    void operation(async () => {
      const opened = await openSave(id)
      activate(opened.career)
      setVault(await listSaves())
      if (opened.recovered) setNotice({ text: 'A revisão anterior da carreira foi recuperada.', error: false })
      navigate(hasLiveBout(opened.career) ? 'combates' : 'inicio')
    })
  }

  function upload(file: File) {
    void operation(async () => {
      const imported = await createSave(importCareer(await file.text()))
      activate(imported)
      setNotice({ text: 'Carreira importada como uma cópia independente.', error: false })
    })
  }

  function download(saved: Career) {
    const url = URL.createObjectURL(new Blob([exportCareer(saved)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'wrestling-legacy-' + saved.id.slice(0, 8) + '.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function advance() {
    change(advanceCareer, saved => {
      if (hasLiveBout(saved)) navigate('combates')
      else if (saved.contract?.status === 'expired') navigate('contratos')
      else navigate('calendario')
    })
  }

  const openNew = () => navigate('nova-carreira')
  const openCalendar = () => navigate('calendario')
  const openContracts = () => navigate('contratos')
  const openFight = () => navigate('combates')

  function screen() {
    if (!ready) return <section className="panel loading" aria-live="polite">Carregando salvamentos…</section>
    if (route === 'nova-carreira') return <Creator initialDifficulty={defaultDifficulty} pending={pending} onCancel={() => navigate('inicio')} onCreate={create} />
    if (route === 'calendario') return <Calendar career={career} pending={pending} onAdvance={advance} onFight={openFight} />
    if (route === 'empresas') return <Companies career={career} />
    if (route === 'campeonatos') return <Championships career={career} />
    if (route === 'salvamentos') return <Saves vault={vault} current={career} pending={pending} onOpen={resume} onNew={openNew}
      onSave={() => change(current => current, () => setNotice({ text: 'Carreira salva.', error: false }))}
      onImport={upload} onExport={download} />
    if (route === 'configuracoes') return <Settings value={career?.difficulty ?? defaultDifficulty} current={Boolean(career)} pending={pending}
      onDifficulty={difficulty => {
        if (career) change(current => setDifficulty(current, difficulty))
        else {
          setDefaultDifficulty(difficulty)
          remember(DEFAULT_DIFFICULTY, difficulty)
        }
      }} />
    if (career) {
      if (route === 'lutador') return <Player career={career} pending={pending}
        onAttribute={attribute => change(current => improveAttribute(current, attribute))}
        onMove={id => change(current => improveMove(current, id))} />
      if (route === 'contratos') return <Contracts career={career} pending={pending}
        onSign={id => change(current => signOffer(current, id), openCalendar)}
        onDecline={id => change(current => declineOffer(current, id))}
        onNegotiate={(id, pay) => change(current => negotiate(current, id, pay))}
        onRefresh={() => change(renewOffers)} onCalendar={openCalendar} />
      if (route === 'combates') return <Fight career={career} pending={pending}
        onTurn={id => change(current => resolvePlayerTurn(current, id))} onAdvance={advance} onContracts={openContracts} />
      if (route === 'noticias' || route === 'historico') return <Feed key={route} career={career} history={route === 'historico'} />
    }
    return <Home career={career} pending={pending} onNew={openNew} onSaves={() => navigate('salvamentos')}
      onCalendar={openCalendar} onCompanies={() => navigate('empresas')} onContracts={openContracts} onFight={openFight} onAdvance={advance} />
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); main.current?.focus() }}>Ir para o conteúdo</a>
    {menu && <button type="button" className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMenu(false)} />}
    <aside className={'rail' + (menu ? ' open' : '')} aria-label="Barra lateral">
      <a className="brand" href="#/inicio" onClick={event => { event.preventDefault(); navigate('inicio') }}>
        <span className="brand-icon"><Swords size={21} aria-hidden /></span><span>Wrestling<strong>Legacy</strong></span>
      </a>
      <nav aria-label="Navegação principal">
        {nav.map(item => <a key={item.route} className={'nav-link' + (item.route === route ? ' active' : '')} href={'#/' + item.route}
          aria-current={item.route === route ? 'page' : undefined} onClick={event => { event.preventDefault(); navigate(item.route) }}>
          <item.icon size={18} aria-hidden /><span>{item.label}</span>{item.route === 'combates' && career && hasLiveBout(career) && <span className="live-dot" aria-label="luta em andamento" />}
        </a>)}
      </nav>
      <div className="rail-bottom">
        <button className="rail-new" onClick={openNew}><Plus size={18} aria-hidden /> Nova carreira</button>
        <span>Universo 2026</span>
      </div>
    </aside>
    <div className="app-body">
      <header className="topbar">
        <div className="topbar-left"><button className="menu-toggle" type="button" aria-label={menu ? 'Fechar navegação' : 'Abrir navegação'} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button><div className="breadcrumb"><span>Wrestling Legacy</span><span className="slash">/</span><strong>{title}</strong></div></div>
        <div className="topbar-right">
          {career && <button className="save-indicator" onClick={() => navigate('salvamentos')} aria-label="Ir aos salvamentos" title={pending ? 'Salvando' : 'Salvamentos'}>
            {pending ? <Save size={15} aria-hidden /> : <Check size={16} aria-hidden />}<span>{pending ? 'Salvando…' : 'Salvo'}</span>
          </button>}
          <div className="current-date"><CalendarDays size={16} aria-hidden /> <time dateTime={career?.date ?? START_DATE}>{dateText(career?.date ?? START_DATE)}</time></div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} ref={main} className="page">
        {notice && <div className={'notice ' + (notice.error ? 'error' : '')} role={notice.error ? 'alert' : 'status'}>
          {notice.error ? <AlertCircle size={19} aria-hidden /> : <Check size={19} aria-hidden />}<span>{notice.text}</span>
          <button type="button" aria-label="Dispensar aviso" onClick={() => setNotice(null)}><X size={17} /></button>
        </div>}
        {screen()}
        {route === 'inicio' && career && !hasLiveBout(career) && career.contract?.status !== 'active' &&
          <button className="text-button market-shortcut" onClick={openContracts}>Abrir mercado de contratos <ArrowRight size={16} aria-hidden /></button>}
      </main>
    </div>
  </div>
}
