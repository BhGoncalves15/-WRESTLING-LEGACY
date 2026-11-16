import { ArrowRight, Download, Plus, Save, Upload } from 'lucide-react'
import { useRef } from 'react'
import { ORGANIZATIONS } from '../content/catalog'
import { DIFFICULTIES, DIFFICULTY_LABEL, type Career, type Difficulty } from '../domain/model'
import type { Vault } from '../storage/indexed-db'
import { defaultAppearance } from '../domain/appearance'
import { FighterAvatar } from './avatar'
import { dateText, EmptyState, PageTitle } from './shared'

export function Saves({ vault, current, pending, onOpen, onNew, onSave, onImport, onExport }: {
  vault: Vault; current: Career | null; pending: boolean; onOpen: (id: string) => void; onNew: () => void;
  onSave: () => void; onImport: (file: File) => void; onExport: (career: Career) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  return <>
    <PageTitle title="Salvamentos" intro="Carreiras guardadas neste navegador."
      action={<button className="button primary" onClick={onNew}><Plus size={18} aria-hidden /> Nova carreira</button>} />
    <div className="save-toolbar">
      {current && <button className="button secondary" onClick={onSave} disabled={pending}><Save size={17} aria-hidden /> Salvar agora</button>}
      <button className="button secondary" onClick={() => fileInput.current?.click()} disabled={pending}><Upload size={17} aria-hidden /> Importar carreira</button>
      <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Arquivo de carreira" className="sr-only" tabIndex={-1}
        onChange={event => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = '' }} />
    </div>
    {vault.damaged > 0 && <p className="inline-note" role="alert">{vault.damaged} carreira(s) indisponível(is). Você pode restaurar uma cópia pelo botão Importar carreira.</p>}
    {vault.entries.length ? <div className="stack">{vault.entries.map(({ career, recoveryAvailable }) => <article className="panel save-card" key={career.id}>
      <FighterAvatar name={career.profile.name} look={career.profile.look ?? defaultAppearance()} />
      <div className="row-text"><h2>{career.profile.name}</h2>
        <small>{dateText(career.date)} · {career.contract?.status === 'active' ? ORGANIZATIONS[career.contract.promotion].name : 'Livre no mercado'}</small>
        {recoveryAvailable && <small>Cópia anterior disponível para recuperação</small>}</div>
      <div className="save-actions">
        <button className="button secondary" disabled={pending} onClick={() => onExport(career)}><Download size={17} aria-hidden /> Exportar</button>
        <button className="button primary" disabled={pending} onClick={() => onOpen(career.id)}>
          {recoveryAvailable ? 'Recuperar' : 'Abrir carreira'} <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </article>)}</div> : <EmptyState title="Nenhuma carreira neste navegador">Crie seu lutador ou importe um arquivo de carreira.</EmptyState>}
  </>
}

export function Settings({ value, current, pending, onDifficulty }: {
  value: Difficulty; current: boolean; pending: boolean; onDifficulty: (difficulty: Difficulty) => void
}) {
  return <>
    <PageTitle title="Configurações" />
    <section className="panel settings-panel">
      <header className="panel-head"><div><h2>Dificuldade</h2>
        <p>{current ? 'Aplica-se à carreira aberta.' : 'Dificuldade padrão para a próxima carreira.'}</p></div></header>
      <fieldset className="difficulty-options"><legend className="sr-only">Nível de dificuldade</legend>
        {DIFFICULTIES.map(difficulty => <label className="difficulty-option" key={difficulty}>
          <input type="radio" name="difficulty" value={difficulty} checked={value === difficulty} disabled={pending} onChange={() => onDifficulty(difficulty)} />
          <span><strong>{DIFFICULTY_LABEL[difficulty]}</strong><small>{{
            easy: 'Rivais menos eficientes e negociações mais acessíveis.',
            normal: 'Decisões táticas e negociações equilibradas.',
            hard: 'Rivais aproveitam mais as aberturas e o mercado exige mais.',
          }[difficulty]}</small></span>
        </label>)}
      </fieldset>
    </section>
  </>
}
