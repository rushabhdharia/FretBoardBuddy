import { NAMES } from './detect'
import type { ChordEvent } from './timeline'

export const ALL_CHORDS = NAMES.flatMap(n => [n, n + 'm'])

function parse(name: string) {
  const m = name.match(/^([A-G]#?)(m?)/)!
  const root = NAMES.indexOf(m[1]), minor = m[2] === 'm'
  return { root, minor, pcs: [root, (root + (minor ? 3 : 4)) % 12, (root + 7) % 12] }
}

/** Known chords ranked by how close they sound to `chord`: shared notes, then relative major/minor, then root distance. */
export function suggest(chord: string, known: string[]): string[] {
  const a = parse(chord)
  return known
    .filter(k => k !== chord)
    .map(k => {
      const b = parse(k)
      const shared = a.pcs.filter(p => b.pcs.includes(p)).length
      const relative = a.minor !== b.minor && b.root === (a.minor ? a.root + 3 : a.root + 9) % 12
      const d = Math.abs(a.root - b.root)
      return { k, score: shared * 10 + (relative ? 5 : 0) - Math.min(d, 12 - d) * 0.1 }
    })
    .sort((x, y) => y.score - x.score)
    .map(x => x.k)
}

/** Stable id of a raw chord event: its start in whole ms. Manual edits are keyed by it. */
export const eventId = (e: ChordEvent) => Math.round(e.tabMs)

/**
 * Replaces chords and merges neighbours that become identical. Per-event `overrides` (keyed by eventId)
 * beat the per-chord `map`. `orig` keeps the original name; `ids` lists every raw event a card covers.
 */
export function applySubst(events: ChordEvent[], map: Record<string, string>, overrides: Record<string, string> = {}): ChordEvent[] {
  const out: ChordEvent[] = []
  for (const e of events) {
    const id = eventId(e)
    const chord = overrides[id] ?? map[e.chord] ?? e.chord
    const last = out.at(-1)
    if (last?.chord === chord) { last.ids!.push(id); continue }
    out.push({ ...e, chord, orig: chord === e.chord ? undefined : e.chord, ids: [id] })
  }
  return out
}

/** Substitution map for every chord in the song that is not already known. */
export function autoSubst(events: ChordEvent[], known: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  if (!known.length) return map
  for (const c of new Set(events.map(e => e.chord)))
    if (!known.includes(c)) map[c] = suggest(c, known)[0]
  return map
}
