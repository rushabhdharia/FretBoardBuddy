import { describe, expect, it } from 'vitest'
import { makeLoop, shouldWrap, snapA, snapB } from './loop'

const ev = (...secs: number[]) => secs.map(s => ({ tabMs: s * 1000, chord: 'G', source: 'detected' as const }))

describe('loop', () => {
  const events = ev(0, 4, 8, 12)
  it('A snaps to nearest chord start', () => expect(snapA(events, 4.9)).toBe(4))
  it('B snaps to the next chord start', () => expect(snapB(events, 5)).toBe(8))
  it('B pressed just after a chord began keeps that boundary', () => expect(snapB(events, 8.1)).toBe(8))
  it('B past the last chord start has no target', () => expect(snapB(events, 20)).toBeUndefined())
  it('rejects B before A', () => {
    expect(makeLoop(8, 4)).toBeNull()
    expect(makeLoop(4, 8)).toEqual({ a: 4, b: 8 })
  })
  it('wraps just past B only', () => {
    const loop = { a: 4, b: 8 }
    expect(shouldWrap(loop, 7.9)).toBe(false)
    expect(shouldWrap(loop, 8.05)).toBe(true)
    expect(shouldWrap(loop, 30)).toBe(false)
  })
})
