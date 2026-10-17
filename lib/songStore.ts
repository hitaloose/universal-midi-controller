import { parseSong, type Song } from './chordSheet'

// Chord sheets live in IndexedDB: a folder of songs is too big for the localStorage config.
// The raw file text is stored and parsed on load, so parser improvements reach songs imported earlier.
const DB_NAME = 'umc-songs'
const STORE = 'songs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => {
      db.close()
      resolve(req ? req.result : (undefined as T))
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export type SongFile = { id: string; text: string }

export async function listSongs(): Promise<Song[]> {
  const records = await run<(SongFile | Song)[]>('readonly', (store) => store.getAll())
  // Songs imported before the raw text was stored only have the parsed form.
  return records.map((r) => ('text' in r ? parseSong(r.id, r.text) : r))
}

/** Adds or replaces songs by id (file name). */
export function putSongs(songs: SongFile[]): Promise<void> {
  return run<void>('readwrite', (store) => {
    songs.forEach((s) => store.put(s))
  })
}

export function deleteSong(id: string): Promise<void> {
  return run<void>('readwrite', (store) => {
    store.delete(id)
  })
}
