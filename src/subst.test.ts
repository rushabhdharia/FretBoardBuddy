import { describe, expect, it } from 'vitest'
import { applySubst, autoSubst, suggest } from './subst'

const ev = (...chords: string[]) => chords.map((chord, i) => ({ tabMs: i * 1000, chord, source: 'detected' as const }))

describe('suggest', () => {
  const known = ['A', 'D', 'E']
  it('Bm -> D', () => expect(suggest('Bm', known)[0]).toBe('D'))
  it('F#m -> A (tie with D broken by relative major)', () => expect(suggest('F#m', known)[0]).toBe('A'))
  it('C -> Am relative minor when known', () => expect(suggest('C', ['Am', 'D', 'E'])[0]).toBe('Am'))
})

describe('applySubst', () => {
  it('replaces, remembers original, merges neighbours', () => {
    const out = applySubst(ev('D', 'Bm', 'A', 'F#m', 'A'), { Bm: 'D', 'F#m': 'A' })
    expect(out.map(e => e.chord)).toEqual(['D', 'A'])
    expect(out[0].orig).toBeUndefined()
  })
  it('autoSubst skips known chords', () => {
    expect(autoSubst(ev('A', 'Bm', 'F#m'), ['A', 'D', 'E'])).toEqual({ Bm: 'D', 'F#m': 'A' })
  })
})
