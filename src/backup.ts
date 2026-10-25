import { getBlob, loadKnown, loadSongs, loadVoicing, mergeSongs, putBlob, saveKnown, saveVoicing, type Song } from './store'

/** Everything the app remembers, as one JSON file. mp3 files are left out (large, and not yours to redistribute). */
export type Backup = {
  version: 1
  songs: Record<string, Song>
  known: string[]
  voicing: Record<string, number>
  gp: Record<string, string> // song key -> tab file as base64
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Parses and checks a backup file. Throws an Error with a readable message. */
export function parseBackup(text: string): Backup {
  let b: unknown
  try { b = JSON.parse(text) } catch { throw new Error('Not a valid backup file (not JSON).') }
  if (!isObj(b) || b.version !== 1) throw new Error('Not a FretBoardBuddy backup (wrong or missing version).')
  const { songs, known, voicing, gp } = b
  if (!isObj(songs) || !Object.values(songs).every(s => isObj(s) && typeof s.key === 'string' && typeof s.gpName === 'string' && isObj(s.source)))
    throw new Error('Backup is damaged: songs are malformed.')
  if (!Array.isArray(known) || !known.every(k => typeof k === 'string')) throw new Error('Backup is damaged: known chords are malformed.')
  if (!isObj(voicing) || !Object.values(voicing).every(v => typeof v === 'number')) throw new Error('Backup is damaged: chord shapes are malformed.')
  if (!isObj(gp) || !Object.values(gp).every(v => typeof v === 'string')) throw new Error('Backup is damaged: tab files are malformed.')
  return b as Backup
}

async function toBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromBase64 = (b64: string) => new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))])

export async function makeBackup(): Promise<Backup> {
  const songs = loadSongs()
  const gp: Backup['gp'] = {}
  for (const key of Object.keys(songs)) {
    const blob = await getBlob(`gp:${key}`)
    if (blob) gp[key] = await toBase64(blob)
  }
  return { version: 1, songs, known: loadKnown(), voicing: loadVoicing(), gp }
}

/** Merges a backup into this browser: songs and chord shapes from the backup win, known chords are combined. Returns the song count. */
export async function restoreBackup(b: Backup): Promise<number> {
  mergeSongs(b.songs)
  saveKnown([...new Set([...loadKnown(), ...b.known])])
  saveVoicing({ ...loadVoicing(), ...b.voicing })
  for (const [key, b64] of Object.entries(b.gp)) await putBlob(`gp:${key}`, fromBase64(b64))
  return Object.keys(b.songs).length
}
