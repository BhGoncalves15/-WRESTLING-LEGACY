import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { advanceCareer, exampleProfile, newCareer, signOffer } from '../src/engine/career'
import { createSave, listSaves, openSave, saveCareer } from '../src/storage/indexed-db'
import { exportCareer, importCareer, validateCareer } from '../src/storage/save-format'

function damageCurrent(id: string) {
  return new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('wrestling-legacy', 1)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('careers', 'readwrite')
      tx.objectStore('careers').put({ id, revision: 1, career: { broken: true } })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onabort = () => { db.close(); reject(tx.error) }
    }
    open.onerror = () => reject(open.error)
  })
}

describe('integridade de saves', () => {
  it('isola carreiras e impede duas abas de gravarem na mesma revisão', async () => {
    const original = await createSave(newCareer(exampleProfile(), 'normal', { seed: 123 }))
    const other = await createSave(newCareer({ ...exampleProfile(), name: 'Outra carreira' }, 'normal', { seed: 456 }))
    const candidate = signOffer(original, original.offers[0].id)
    const writes = await Promise.allSettled([saveCareer(candidate), saveCareer(candidate)])
    expect(writes.filter(write => write.status === 'fulfilled')).toHaveLength(1)
    expect(writes.filter(write => write.status === 'rejected')).toHaveLength(1)
    expect((await openSave(original.id)).career.revision).toBe(1)
    expect((await openSave(other.id)).career).toEqual(other)
  })

  it('recupera a última cópia válida e mantém uma revisão crescente', async () => {
    const original = await createSave(newCareer(exampleProfile(), 'normal', { seed: 456 }))
    await saveCareer(signOffer(original, original.offers[0].id))
    await damageCurrent(original.id)
    expect((await listSaves()).entries.find(entry => entry.career.id === original.id)?.recoveryAvailable).toBe(true)
    const opened = await openSave(original.id)
    expect(opened.recovered).toBe(true)
    expect(opened.career.revision).toBe(2)
    expect(opened.career.contract).toBeNull()
    expect((await openSave(original.id)).recovered).toBe(false)
  })

  it('importa cópias independentes e rejeita JSON quebrado, eventos repetidos ou versões desconhecidas', () => {
    const original = newCareer(exampleProfile(), 'normal', { seed: 789 })
    const signed = signOffer(original, original.offers[0].id)
    const advanced = advanceCareer(signed)
    const copy = importCareer(exportCareer(advanced))
    expect(copy.id).not.toBe(advanced.id)
    expect(copy.bout).toEqual(advanced.bout)
    expect(copy.rng).toBe(advanced.rng)
    expect(() => validateCareer({ ...advanced, shows: [advanced.shows[0], ...advanced.shows] })).toThrow(/inconsistentes/)
    expect(() => importCareer('{broken')).toThrow(/JSON/)
    expect(() => importCareer(JSON.stringify({ format: 'wrestling-legacy', version: 9, career: original }))).toThrow(/incompatível/)
  })
})
