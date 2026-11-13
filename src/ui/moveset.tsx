import { CirclePlay, LockKeyhole, Pause, RotateCcw } from 'lucide-react'
import { useRef, useState } from 'react'
import { MOVE_BY_ID, MOVES, type Move } from '../content/moves'
import { MOVE_DESCRIPTIONS, MOVE_REFERENCES } from '../content/move-details'
import { searchKey } from '../domain/geography'
import { ATTRIBUTE_NAMES, MOVE_KINDS, MOVE_KIND_LABEL, MOVE_SLOTS, type MoveKind, type Profile } from '../domain/model'
import { controlAttribute, FINISHER_MOMENTUM, SIGNATURE_MOMENTUM } from '../engine/combat'
import { SourceLink } from './shared'

function Demo({ move }: { move: Move }) {
  const video = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  function play(replay = false) {
    if (!video.current) return
    if (replay) video.current.currentTime = 0
    void video.current.play().catch(() => {
      if (video.current?.error) setFailed(true)
    })
  }
  return <div className="move-demo">
    <video ref={video} controls playsInline muted preload="metadata"
      src={import.meta.env.BASE_URL + 'moves/' + move.id + '.mp4'} aria-label={'Demonstração 2D de ' + move.name}
      onLoadedMetadata={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false) }}
      onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
      onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); setLoading(false) }} onEnded={() => setPlaying(false)} />
    {failed ? <p className="demo-status" role="status">Vídeo indisponível. Consulte a descrição abaixo.</p>
      : loading && <p className="demo-status" role="status">Carregando demonstração…</p>}
    <div className="demo-controls">
      <small>Demonstração 2D original · sem áudio</small>
      <button type="button" className="button secondary" disabled={failed} onClick={() => playing ? video.current?.pause() : play()}>
        {playing ? <Pause size={16} aria-hidden /> : <CirclePlay size={16} aria-hidden />}{playing ? 'Pausar' : 'Reproduzir'}
      </button>
      <button type="button" className="button secondary" disabled={failed || loading} onClick={() => play(true)}><RotateCcw size={16} aria-hidden /> Rever</button>
    </div>
  </div>
}

type Props = {
  profile: Profile
  disabled?: boolean
  onEquip: (id: string, replaced: string) => void
  onRemove?: (id: string) => void
  onUnlock?: (id: string) => void
  unlockIssue?: (id: string) => string | null
}

const lockedFor = (profile: Profile, move: Move) => Boolean(move.unlock && !profile.unlockedMoves?.includes(move.id))

export default function Moveset({ profile, disabled, onEquip, onRemove, onUnlock, unlockIssue }: Props) {
  const [kind, setKind] = useState<MoveKind | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const [replace, setReplace] = useState('')
  const equipped = (id: string) => profile.moves.includes(id)
  const moves = MOVES.filter(move => (kind === 'all' || move.kind === kind)
    && searchKey([move.name, ...(MOVE_REFERENCES[move.id] ?? []).flatMap(reference => [reference.alias, reference.fighter])].join(' ')).includes(searchKey(query)))
  const move = moves.find(entry => entry.id === selected)
  const references = move ? MOVE_REFERENCES[move.id] ?? [] : []
  const sameCategory = move ? profile.moves.filter(id => MOVE_BY_ID.get(id)?.kind === move.kind) : []
  const spare = move && sameCategory.length < MOVE_SLOTS[move.kind]
  const locked = move && lockedFor(profile, move)
  const issue = locked && unlockIssue?.(move.id)
  const level = move ? profile.moveLevels[move.id] ?? 0 : 0

  return <section className="moveset" aria-label="Catálogo de golpes">
    <ul className="move-quota" aria-label="Espaços do moveset">
      {MOVE_KINDS.map(type => <li key={type}>{MOVE_KIND_LABEL[type]} <strong>{profile.moves.filter(id => MOVE_BY_ID.get(id)?.kind === type).length}/{MOVE_SLOTS[type]}</strong></li>)}
    </ul>
    <div className="move-layout">
      <div className="move-list">
        <div className="move-filters">
          <label>Buscar golpe<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label>Categoria<select value={kind} onChange={event => setKind(event.target.value as typeof kind)}>
            <option value="all">Todas</option>
            {MOVE_KINDS.map(type => <option key={type} value={type}>{MOVE_KIND_LABEL[type]}</option>)}
          </select></label>
        </div>
        <ul className="rows" aria-label="Golpes disponíveis para consulta">{moves.map(entry => {
          const alias = MOVE_REFERENCES[entry.id]?.find(reference => reference.alias !== entry.name)?.alias
          return <li key={entry.id}><button type="button" className="move-option" aria-pressed={move?.id === entry.id} onClick={() => {
            setSelected(entry.id)
            setReplace('')
          }}>
            <span><strong>{entry.name}</strong>{alias && <small> · {alias}</small>}</span>
            <small>{equipped(entry.id) ? 'Equipado' : lockedFor(profile, entry) ? 'Bloqueado' : 'Disponível'}</small>
          </button></li>
        })}</ul>
        {!moves.length && <p className="empty-line">Nenhum golpe encontrado.</p>}
      </div>
      <div className="move-preview" aria-label="Pré-visualização do golpe">
        {move ? <>
          <header className="move-title"><div><h3>{move.name}</h3><small>{MOVE_KIND_LABEL[move.kind]}</small></div>
            {locked && <span className="chip"><LockKeyhole size={13} aria-hidden /> Bloqueado</span>}
          </header>
          <Demo key={move.id} move={move} />
          <p>{MOVE_DESCRIPTIONS[move.id]}</p>
          {references.map(reference => <p key={reference.fighter} className="move-reference">
            {reference.alias} · {reference.fighter} <SourceLink url={reference.source} />
          </p>)}
          <dl className="move-stats">
            <div><dt>Atributo principal</dt><dd>{ATTRIBUTE_NAMES[controlAttribute[move.kind]]}</dd></div>
            <div><dt>Impacto base</dt><dd>{move.impact}{level > 0 && ' · nível ' + level + '/3'}</dd></div>
            <div><dt>Stamina</dt><dd>{Math.max(2, move.cost - level)}</dd></div>
            <div><dt>Posição</dt><dd>{move.topRope ? 'No corner' : 'Em pé'}</dd></div>
            {(move.kind === 'finisher' || move.kind === 'signature') && <div><dt>Momentum mínimo</dt>
              <dd>{move.kind === 'finisher' ? FINISHER_MOMENTUM : SIGNATURE_MOMENTUM}</dd></div>}
            {move.knockdown && <div><dt>Efeito</dt><dd>Derruba quando acertado</dd></div>}
            {move.counters && <div><dt>Reverte</dt><dd>{move.counters.map(type => MOVE_KIND_LABEL[type]).join(' / ')}</dd></div>}
          </dl>
          {locked && move.unlock ? <div className="move-equip">
            <small>Aprender por {move.unlock.xp} XP · {ATTRIBUTE_NAMES[move.unlock.attribute]} {move.unlock.minimum}</small>
            {onUnlock ? <button type="button" className="button primary" disabled={disabled || Boolean(issue)} onClick={() => onUnlock(move.id)}>Aprender golpe</button>
              : <small>Disponível durante a carreira.</small>}
            {issue && <small>{issue}</small>}
          </div> : equipped(move.id)
            ? onRemove && <button type="button" className="button secondary" onClick={() => onRemove(move.id)}>Remover do moveset</button>
            : <div className="move-equip">
              {!spare && <label>Golpe a substituir
                <select value={sameCategory.includes(replace) ? replace : ''} onChange={event => setReplace(event.target.value)} disabled={disabled}>
                  <option value="">Escolha um golpe</option>
                  {sameCategory.map(id => <option key={id} value={id}>{MOVE_BY_ID.get(id)?.name}</option>)}
                </select></label>}
              <button type="button" className="button primary" disabled={disabled || (!spare && !sameCategory.includes(replace))}
                onClick={() => onEquip(move.id, spare ? '' : replace)}>{spare ? 'Adicionar ao moveset' : 'Substituir golpe'}</button>
            </div>}
        </> : <div className="move-empty"><CirclePlay size={31} aria-hidden /><p>Selecione um golpe para ver a demonstração e os requisitos.</p></div>}
      </div>
    </div>
  </section>
}
