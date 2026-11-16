import { useState, type CSSProperties } from 'react'
import { beltVisualFor, type BeltVisualRecord } from '../content/belt-catalog'
import type { TitleRecord } from '../content/titles'
import type { Career } from '../domain/model'

type BeltProps = Parameters<typeof beltVisualFor>[2] & { title: TitleRecord; career: Career | null; size?: 'catalog' | 'thumbnail' | 'feature' }

function inscriptionLines(inscription: string) {
  const text = inscription.toUpperCase()
  if (text.includes(' / ')) return text.split(' / ', 2)
  if (text.length <= 18) return [text]
  const middle = Math.floor(text.length / 2)
  const prior = text.lastIndexOf(' ', middle)
  const next = text.indexOf(' ', middle + 1)
  const split = prior === -1 || (next !== -1 && next - middle < middle - prior) ? next : prior
  return split === -1 ? [text] : [text.slice(0, split), text.slice(split + 1)]
}

export function BeltAttribution({ visual }: { visual: BeltVisualRecord }) {
  if (visual.kind === 'pending') return <p className="belt-credit">
    <a href={visual.reference} target="_blank" rel="noreferrer">Consultar referência do campeonato</a>
  </p>
  if (visual.kind === 'photo') return <p className="belt-credit">
    Foto de <a href={visual.photo.source} target="_blank" rel="noreferrer">{visual.photo.author}</a> ·
    {' '}<a href={visual.photo.licenseUrl} target="_blank" rel="noreferrer">{visual.photo.license}</a> · {visual.photo.note}
  </p>
  return <p className="belt-credit">Modelo fictício em 3D do Wrestling Legacy.</p>
}

function BeltFrame({ visual, size = 'catalog' }: { visual: BeltVisualRecord; size?: BeltProps['size'] }) {
  const [failed, setFailed] = useState(false)
  const lines = visual.kind === 'studio' ? inscriptionLines(visual.inscription) : []
  const accessibleName = visual.kind === 'photo' ? 'Fotografia do ' + visual.name : 'Modelo 3D do ' + visual.name
  return <div className={'belt-media belt-media-' + size} data-belt-kind={visual.kind}>
    {visual.kind === 'pending' || failed
      ? <span className="belt-pending">{failed ? 'Imagem indisponível' : 'Foto de catálogo pendente'}</span>
      : <>
        <img src={import.meta.env.BASE_URL + visual.asset} loading={size === 'feature' ? 'eager' : 'lazy'} decoding="async"
          alt={accessibleName} onError={() => setFailed(true)} />
        {lines.length > 0 && <div className="belt-inscription" aria-hidden>
          {lines.map((line, index) => <span key={index} style={{ '--letter-size': Math.min(1.55, 26 / line.length) } as CSSProperties}>{line}</span>)}
        </div>}
      </>}
  </div>
}

export function BeltVisual({ title, career, size, ...options }: BeltProps) {
  const visual = beltVisualFor(title, career, options)
  return <BeltFrame visual={visual} key={visual.kind === 'pending' ? title.id : visual.asset} size={size} />
}
