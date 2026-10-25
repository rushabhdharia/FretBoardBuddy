import { describe, expect, it } from 'vitest'
import { bestCapos, capoShift, transposeChord } from './capo'

const ev = (...chords: string[]) => chords.map((chord, i) => ({ tabMs: i * 1000, chord, source: 'detected' as const }))

describe('capo', () => {
  it('transposes and wraps', () => {
    expect(transposeChord('A', -2)).toBe('G')
    expect(transposeChord('C', -1)).toBe('B')
    expect(transposeChord('F#m', 1)).toBe('Gm')
    expect(transposeChord('A5', -2)).toBe('A5') // unknown names pass through
  })
  it('capoShift lowers shapes', () => expect(capoShift(ev('A', 'D'), 2).map(e => e.chord)).toEqual(['G', 'C']))
  it('finds the capo that leaves no unknown chords', () => {
    const best = bestCapos(ev('A', 'D', 'E', 'A'), ['G', 'C', 'D'])[0]
    expect(best).toEqual({ capo: 2, unknown: 0, total: 3 })
  })
  it('prefers the lower capo on ties', () => {
    expect(bestCapos(ev('G', 'C', 'D'), ['G', 'C', 'D'])[0].capo).toBe(0)
  })
})
