import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { deleteLocalBeltPhoto, loadLocalBeltPhotos, saveLocalBeltPhoto } from '../storage/local-belt-photos'
import { BELT_PHOTO_TYPES, frameBeltPhoto } from './belt-photo-frame'

type Library = {
  photos: ReadonlyMap<string, string>
  save: (titleId: string, file: File) => Promise<void>
  remove: (titleId: string) => Promise<void>
}

const BeltPhotoContext = createContext<Library | null>(null)

export function BeltPhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Map<string, string> | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    let current = true
    loadLocalBeltPhotos().then(records => {
      if (current) setPhotos(records)
    }).catch(() => {
      if (current) setUnavailable(true)
    })
    return () => { current = false }
  }, [])

  async function save(titleId: string, file: File) {
    const url = await frameBeltPhoto(file)
    await saveLocalBeltPhoto(titleId, url)
    setPhotos(previous => new Map(previous).set(titleId, url))
  }

  async function remove(titleId: string) {
    await deleteLocalBeltPhoto(titleId)
    setPhotos(previous => {
      const next = new Map(previous)
      next.delete(titleId)
      return next
    })
  }

  const value = !unavailable && photos ? { photos, save, remove } : null
  return <BeltPhotoContext value={value}>{children}</BeltPhotoContext>
}

export function useBeltPhotoLibrary() {
  return useContext(BeltPhotoContext)
}

export function LocalBeltPhotoControls({ titleId }: { titleId: string }) {
  const library = useBeltPhotoLibrary()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  if (!library) return null
  const hasPhoto = library.photos.has(titleId)

  async function apply(operation: () => Promise<void>, success: string) {
    setMessage(null)
    setBusy(true)
    try {
      await operation()
      setMessage({ text: success, error: false })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'A operação com a foto não foi concluída.', error: true })
    } finally {
      setBusy(false)
    }
  }

  return <div className="belt-local-photo">
    <label>{hasPhoto ? 'Trocar foto do cinturão' : 'Adicionar foto autorizada do cinturão'}
      <input type="file" accept={BELT_PHOTO_TYPES.join(',')} disabled={busy} onChange={event => {
        const input = event.currentTarget
        const file = input.files?.[0]
        input.value = ''
        if (file) void apply(() => library.save(titleId, file), 'Foto salva neste navegador.')
      }} />
    </label>
    {hasPhoto && <button className="button secondary" type="button" disabled={busy}
      onClick={() => void apply(() => library.remove(titleId), 'Foto removida deste navegador.')}>Remover foto local</button>}
    <small>Use a foto da edição de referência em fundo branco. A imagem fica neste navegador.</small>
    {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
  </div>
}
