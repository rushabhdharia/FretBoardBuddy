import { get } from 'idb-keyval'
import { loadKnown, loadSongs, putBlob, saveKnown, saveSong, saveVoicing, type Song } from './store'

const DONE = 'fbb.migrated'

/**
 * One time: older versions kept everything in this browser (localStorage + IndexedDB).
 * If the server database is still empty, copy that data into it. The browser copy is left alone.
 */
export async function migrateBrowserData(): Promise<number> {
  if (localStorage.getItem(DONE) || Object.keys(loadSongs()).length || loadKnown().length) return 0
  const songs: Record<string, Song> = JSON.parse(localStorage.getItem('fbb.songs') ?? '{}')
  const known: string[] = JSON.parse(localStorage.getItem('fbb.known') ?? '[]')
  const voicing: Record<string, number> = JSON.parse(localStorage.getItem('fbb.voicing') ?? '{}')
  if (!Object.keys(songs).length && !known.length) return 0

  for (const song of Object.values(songs)) {
    await saveSong(song)
    const gp = await get<Blob>(`gp:${song.key}`)
    if (gp) await putBlob(`gp:${song.key}`, gp)
    const audio = song.source.type === 'audio' ? await get<Blob>(song.key) : undefined
    if (audio) await putBlob(song.key, audio)
  }
  await saveKnown(known)
  await saveVoicing(voicing)
  localStorage.setItem(DONE, '1')
  return Object.keys(songs).length
}
