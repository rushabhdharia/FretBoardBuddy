import { describe, expect, it } from 'vitest'
import { applySubst, autoSubst, suggest } from './subst'

const ev = (...chords: string[]) => chords.map((chord, i) => ({ tabMs: i * 1000, chord, source: 'detected' as const }))

describe('suggest', () => {
  const known = ['A', 'D', 'E']
  it('Bm -> D', () => expect(suggest('Bm', known)[0]).toBe('D'))
  it('F#m -> A (tie with D broken by relative major)', () => expect(suggest('F#m', known)[0]).toBe('A'))
  it('C -> Am relative minor when known', () => expect(suggest('C', ['Am', 'D', 'E'])[0]).toBe('Am'))
})

describe('overrides', () => {
  const events = ev('G', 'D', 'G', 'D')
  it('beats the per-chord map', () => {
    const out = applySubst(events, { D: 'A' }, { 1000: 'C' })
    expect(out.map(e => e.chord)).toEqual(['G', 'C', 'G', 'A'])
  })
  it('a merged card lists every raw event it covers', () => {
    const out = applySubst(ev('G', 'D', 'D', 'C'), { D: 'G' })
    expect(out.map(e => e.chord)).toEqual(['G', 'C'])
    expect(out[0].ids).toEqual([0, 1000, 2000])
  })
  it('without overrides nothing changes', () => {
    expect(applySubst(events, {}, {}).map(e => e.chord)).toEqual(['G', 'D', 'G', 'D'])
  })
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
