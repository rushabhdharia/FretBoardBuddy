import { NAMES } from './detect'
import type { ChordEvent } from './timeline'

/** Move a major/minor chord name by semitones (wraps around the octave). Other names pass through. */
export function transposeChord(name: string, semitones: number): string {
  const m = name.match(/^([A-G]#?)(m?)$/)
  if (!m) return name
  return NAMES[(NAMES.indexOf(m[1]) + (semitones % 12) + 12) % 12] + m[2]
}

/** Chord shapes to finger with a capo: the sounding chord, `capo` frets lower. */
export function capoShift(events: ChordEvent[], capo: number): ChordEvent[] {
  return capo ? events.map(e => ({ ...e, chord: transposeChord(e.chord, -capo) })) : events
}

export type CapoOption = { capo: number; unknown: number; total: number }

/** Capo 0-7 ranked by how few distinct chord shapes are outside `known`; ties go to the lower fret. */
export function bestCapos(events: ChordEvent[], known: string[]): CapoOption[] {
  const chords = [...new Set(events.map(e => e.chord))]
  return Array.from({ length: 8 }, (_, capo) => {
    const shapes = chords.map(c => transposeChord(c, -capo))
    return { capo, unknown: shapes.filter(s => !known.includes(s)).length, total: shapes.length }
  }).sort((a, b) => a.unknown - b.unknown || a.capo - b.capo)
}
