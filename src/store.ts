export type SongSource = { type: 'youtube'; url: string; id: string } | { type: 'audio'; name: string; size: number }

export type Song = {
  key: string
  title: string
  source: SongSource
  gpName: string
  offset: number
  stretch?: number // older saved songs have none -> 1
  capo?: number // none -> 0
  loop?: { a: number; b: number } | null // tab seconds
  overrides?: Record<string, string> // manual per-chord edits keyed by eventId
  speed: number
  standard: boolean
  subst: Record<string, string>
}

export const songKey = (s: SongSource) => (s.type === 'youtube' ? `yt:${s.id}` : `audio:${s.name}:${s.size}`)

// Everything lives in a SQLite file behind /api (server/api.mjs). The state is loaded once at startup into
// `cache`, so reads stay synchronous; every write updates the cache and is sent to the server.
type State = { songs: Record<string, Song>; known: string[]; voicing: Record<string, number> }
let cache: State = { songs: {}, known: [], voicing: {} }

const errorListeners = new Set<(message: string) => void>()
/** Called when a write to the server fails. Returns an unsubscribe function. */
export function onSaveError(cb: (message: string) => void) {
  errorListeners.add(cb)
  return () => void errorListeners.delete(cb)
}

const enc = encodeURIComponent
async function put(path: string, body: BodyInit, type: string) {
  try {
    const res = await fetch(`/api/${path}`, { method: 'PUT', headers: { 'content-type': type }, body })
    if (!res.ok) throw new Error(`server answered ${res.status}`)
  } catch (e) {
    errorListeners.forEach(cb => cb(`Could not save (${(e as Error).message}). Is the FretBoardBuddy server still running?`))
  }
}
const putJson = (path: string, value: unknown) => put(path, JSON.stringify(value), 'application/json')

/** Loads everything from the server. Throws when it cannot be reached. */
export async function initStore() {
  const res = await fetch('/api/state')
  if (!res.ok) throw new Error(`server answered ${res.status}`)
  cache = await res.json()
}

export const loadSongs = () => cache.songs
export const saveSong = (song: Song) => {
  cache = { ...cache, songs: { ...cache.songs, [song.key]: song } }
  return putJson(`songs/${enc(song.key)}`, song)
}
export const loadKnown = () => cache.known
export const saveKnown = (known: string[]) => { cache = { ...cache, known }; return putJson('known', known) }
// chosen diagram voicing per chord, global
export const loadVoicing = () => cache.voicing
export const saveVoicing = (voicing: Record<string, number>) => { cache = { ...cache, voicing }; return putJson('voicing', voicing) }

// GP tabs and mp3s
export const putBlob = (key: string, blob: Blob) => put(`files/${enc(key)}`, blob, 'application/octet-stream')
export async function getBlob(key: string): Promise<Blob | undefined> {
  const res = await fetch(`/api/files/${enc(key)}`)
  return res.ok ? res.blob() : undefined
}
