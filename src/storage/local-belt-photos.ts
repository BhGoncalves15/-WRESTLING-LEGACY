const DB_NAME = 'wrestling-legacy-media'
const PHOTOS = 'belt-photos'

type LocalPhoto = { titleId: string; url: string }

async function photoRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(PHOTOS, { keyPath: 'titleId' })
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(PHOTOS, mode)
      const request = operation(transaction.objectStore(PHOTOS))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error ?? new Error('A foto não pôde ser salva neste navegador.'))
    })
  } finally {
    db.close()
  }
}

export async function loadLocalBeltPhotos() {
  const photos = await photoRequest('readonly', store => store.getAll() as IDBRequest<LocalPhoto[]>)
  return new Map(photos.map(({ titleId, url }) => [titleId, url]))
}

export async function saveLocalBeltPhoto(titleId: string, url: string) {
  await photoRequest('readwrite', store => store.put({ titleId, url } satisfies LocalPhoto))
}

export async function deleteLocalBeltPhoto(titleId: string) {
  await photoRequest('readwrite', store => store.delete(titleId))
}
