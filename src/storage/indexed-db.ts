import type { Career } from '../domain/model'
import { validateCareer } from './save-format'

const DB_NAME = 'wrestling-legacy'
const DB_VERSION = 1
const CURRENT = 'careers'
const BACKUP = 'backups'

type SavedCareer = { id: string; revision: number; career: unknown }
export type CareerSummary = { career: Career; recoveryAvailable: boolean }
export type Vault = { entries: CareerSummary[]; damaged: number }

let connection: Promise<IDBDatabase> | undefined

function database(): Promise<IDBDatabase> {
  if (connection) return connection
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION)
    open.onupgradeneeded = () => {
      for (const store of [CURRENT, BACKUP]) {
        if (!open.result.objectStoreNames.contains(store)) open.result.createObjectStore(store, { keyPath: 'id' })
      }
    }
    open.onerror = () => reject(open.error)
    open.onblocked = () => reject(new Error('Feche as outras abas do jogo para abrir os salvamentos.'))
    open.onsuccess = () => {
      const db = open.result
      db.onversionchange = () => {
        db.close()
        connection = undefined
      }
      resolve(db)
    }
  }).catch(error => {
    connection = undefined
    throw error
  })
  return connection
}

function getResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function stored(career: Career): SavedCareer {
  return { id: career.id, revision: career.revision, career }
}

function readValid(record: SavedCareer | undefined): Career | null {
  if (!record) return null
  try {
    const career = validateCareer(record.career)
    return career.id === record.id && career.revision === record.revision ? career : null
  } catch {
    return null
  }
}

function failure(error: DOMException | null): Error {
  if (error?.name === 'QuotaExceededError') return new Error('O navegador ficou sem espaço para salvar. Exporte uma cópia da carreira.')
  return new Error(error?.message || 'O navegador interrompeu a gravação do save.')
}

async function transaction<T>(run: (
  current: IDBObjectStore, backup: IDBObjectStore, complete: (result: T) => void, cancel: (error: Error) => void,
) => void): Promise<T> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CURRENT, BACKUP], 'readwrite')
    let result: T
    let reason: Error | undefined
    tx.oncomplete = () => resolve(result)
    tx.onabort = () => reject(reason ?? failure(tx.error))
    try {
      run(tx.objectStore(CURRENT), tx.objectStore(BACKUP), value => { result = value }, error => {
        reason = error
        tx.abort()
      })
    } catch (error) {
      reason = error instanceof Error ? error : new Error(String(error))
      tx.abort()
    }
  })
}

export async function createSave(career: Career): Promise<Career> {
  const valid = validateCareer(career)
  if (valid.revision !== 0) throw new Error('Uma nova carreira começa na revisão zero.')
  return transaction((current, _backup, complete) => {
    current.add(stored(valid))
    complete(valid)
  })
}

export async function saveCareer(career: Career): Promise<Career> {
  const next = validateCareer({ ...career, revision: career.revision + 1 })
  return transaction((current, backup, complete, cancel) => {
    const previous = current.get(career.id) as IDBRequest<SavedCareer | undefined>
    previous.onsuccess = () => {
      const entry = previous.result
      const valid = readValid(entry)
      if (!entry || !valid || entry.revision !== career.revision) {
        cancel(new Error('O save mudou em outra aba ou está indisponível. Reabra a carreira em Salvamentos.'))
        return
      }
      backup.put(entry)
      current.put(stored(next))
      complete(next)
    }
  })
}

export async function listSaves(): Promise<Vault> {
  const db = await database()
  const tx = db.transaction([CURRENT, BACKUP], 'readonly')
  const [careers, backups] = await Promise.all([
    getResult<SavedCareer[]>(tx.objectStore(CURRENT).getAll()),
    getResult<SavedCareer[]>(tx.objectStore(BACKUP).getAll()),
  ])
  const byId = new Map(backups.map(record => [record.id, record]))
  const entries: CareerSummary[] = []
  let damaged = 0
  for (const entry of careers) {
    const current = readValid(entry)
    const recover = current ? null : readValid(byId.get(entry.id))
    if (current || recover) entries.push({ career: (current ?? recover)!, recoveryAvailable: Boolean(recover) })
    else damaged++
  }
  entries.sort((a, b) => b.career.createdAt - a.career.createdAt)
  return { entries, damaged }
}

export async function openSave(id: string): Promise<{ career: Career; recovered: boolean }> {
  return transaction((current, backup, complete, cancel) => {
    const latest = current.get(id) as IDBRequest<SavedCareer | undefined>
    latest.onsuccess = () => {
      const entry = latest.result
      const valid = readValid(entry)
      if (valid) {
        complete({ career: valid, recovered: false })
        return
      }
      const snapshot = backup.get(id) as IDBRequest<SavedCareer | undefined>
      snapshot.onsuccess = () => {
        const previous = readValid(snapshot.result)
        if (!previous) {
          cancel(new Error('Esta carreira está indisponível. Você pode importar uma cópia exportada.'))
          return
        }
        const lastRevision = Number.isSafeInteger(entry?.revision) ? entry!.revision : previous.revision
        const career = { ...previous, revision: Math.max(previous.revision, lastRevision) + 1 }
        current.put(stored(career))
        complete({ career, recovered: true })
      }
    }
  })
}
