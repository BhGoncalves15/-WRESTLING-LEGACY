import { useState, type CSSProperties } from 'react'
import { beltVisualFor, type BeltVisualRecord } from '../content/belt-catalog'
import type { TitleRecord } from '../content/titles'
import { START_DATE, type Career } from '../domain/model'
import { useBeltPhotoLibrary } from './belt-photo-library'

type BeltProps = Parameters<typeof beltVisualFor>[2] & { title: TitleRecord; career: Career | null; size?: 'catalog' | 'thumbnail' | 'feature' }
type DisplayBelt = BeltVisualRecord | { kind: 'local'; name: string; reference: string; url: string }

export function useBeltVisual(title: TitleRecord, career: Career | null, options: Parameters<typeof beltVisualFor>[2] = {}): DisplayBelt {
  const photos = useBeltPhotoLibrary()
  const visual = beltVisualFor(title, career, options)
  if (visual.kind === 'catalog' && title.origin !== 'fictional' && (options.date ?? career?.date ?? START_DATE) >= START_DATE) {
    const url = photos?.photos.get(title.id)
    if (url) return { ...visual, kind: 'local', url }
  }
  return visual
}

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

export function BeltAttribution({ visual }: { visual: DisplayBelt }) {
  if (visual.kind === 'catalog' || visual.kind === 'local') return <p className="belt-credit">
    {visual.kind === 'local' ? 'Foto deste navegador · ' : 'Representação visual feita para o jogo · '}
    <a href={visual.reference} target="_blank" rel="noreferrer">Consultar referência do campeonato</a>
  </p>
  if (visual.kind === 'photo') return <p className="belt-credit">
    Foto de <a href={visual.photo.source} target="_blank" rel="noreferrer">{visual.photo.author}</a> ·
    {' '}<a href={visual.photo.licenseUrl} target="_blank" rel="noreferrer">{visual.photo.license}</a> · {visual.photo.note}
  </p>
  return <p className="belt-credit">Modelo fictício em 3D do Wrestling Legacy.</p>
}

function BeltFrame({ visual, size = 'catalog' }: { visual: DisplayBelt; size?: BeltProps['size'] }) {
  const [failed, setFailed] = useState(false)
  const lines = visual.kind === 'studio' ? inscriptionLines(visual.inscription) : []
  const accessibleName = (visual.kind === 'studio' ? 'Modelo 3D do '
    : visual.kind === 'catalog' ? 'Representação de ' : 'Fotografia do ') + visual.name
  return <div className={'belt-media belt-media-' + size} data-belt-kind={visual.kind}>
    {failed
      ? <span className="belt-load-error" role="status">Imagem do cinturão indisponível</span>
      : <>
        <img src={visual.kind === 'local' ? visual.url : import.meta.env.BASE_URL + visual.asset} loading={size === 'feature' ? 'eager' : 'lazy'} decoding="async"
          alt={accessibleName} onError={() => setFailed(true)} />
        {visual.kind === 'studio' && visual.lineage && visual.lineage.map((asset, index) =>
          <span className="belt-lineage-badge" aria-hidden="true" key={index}
            style={{ '--plate-art': `url("${import.meta.env.BASE_URL + asset}")`, '--plate-position': index === 0 ? '28.73%' : '71.27%' } as CSSProperties} />)}
        {lines.length > 0 && <div className="belt-inscription" aria-hidden>
          {lines.map((line, index) => <span key={index} style={{ '--letter-size': Math.min(1.55, 26 / line.length) } as CSSProperties}>{line}</span>)}
        </div>}
      </>}
  </div>
}

export function BeltVisual({ title, career, size, ...options }: BeltProps) {
  const visual = useBeltVisual(title, career, options)
  const key = visual.kind === 'local' ? visual.url : visual.asset
  return <BeltFrame visual={visual} key={key} size={size} />
}
