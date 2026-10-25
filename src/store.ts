import { get, set } from 'idb-keyval'

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

const SONGS = 'fbb.songs'
const KNOWN = 'fbb.known'

export const songKey = (s: SongSource) => (s.type === 'youtube' ? `yt:${s.id}` : `audio:${s.name}:${s.size}`)

// settings are small -> localStorage; GP/mp3 files are big -> IndexedDB
export const loadSongs = (): Record<string, Song> => JSON.parse(localStorage.getItem(SONGS) ?? '{}')
export const saveSong = (song: Song) => localStorage.setItem(SONGS, JSON.stringify({ ...loadSongs(), [song.key]: song }))
export const mergeSongs = (songs: Record<string, Song>) => localStorage.setItem(SONGS, JSON.stringify({ ...loadSongs(), ...songs }))
export const loadKnown = (): string[] => JSON.parse(localStorage.getItem(KNOWN) ?? '[]')
export const saveKnown = (known: string[]) => localStorage.setItem(KNOWN, JSON.stringify(known))

export const putBlob = (key: string, blob: Blob) => set(key, blob)
export const getBlob = (key: string) => get<Blob>(key)

// chosen diagram voicing per chord, global
export const loadVoicing = (): Record<string, number> => JSON.parse(localStorage.getItem('fbb.voicing') ?? '{}')
export const saveVoicing = (v: Record<string, number>) => localStorage.setItem('fbb.voicing', JSON.stringify(v))
