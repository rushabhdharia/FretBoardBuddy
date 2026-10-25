import { describe, expect, it } from 'vitest'
import { anchorFirst, anchorSecond, mediaToTab, nearestEvent, tabToMedia } from './sync'

const ev = (...secs: number[]) => secs.map(s => ({ tabMs: s * 1000, chord: 'G', source: 'detected' as const }))

describe('sync', () => {
  it('round trips', () => {
    const s = { offset: 2, stretch: 1.02 }
    expect(mediaToTab(s, tabToMedia(s, 37.5))).toBeCloseTo(37.5)
  })
  it('first anchor aligns tab time to media time', () => {
    const s = anchorFirst({ offset: 0, stretch: 1 }, 6, 10)
    expect(tabToMedia(s, 6)).toBeCloseTo(10)
  })
  it('second anchor fixes drift and keeps the first anchor', () => {
    const s0 = { offset: 2, stretch: 1 }
    // recording runs 1% slow: tab 100s lands at media 2 + 101
    const s = anchorSecond(s0, 0, 100, 103)!
    expect(s.stretch).toBeCloseTo(1.01)
    expect(tabToMedia(s, 0)).toBeCloseTo(2)
    expect(tabToMedia(s, 100)).toBeCloseTo(103)
  })
  it('rejects close or absurd anchors', () => {
    expect(anchorSecond({ offset: 0, stretch: 1 }, 0, 5, 5.1)).toBeNull()
    expect(anchorSecond({ offset: 0, stretch: 1 }, 0, 100, 200)).toBeNull()
  })
  it('nearestEvent', () => expect(nearestEvent(ev(0, 4, 8), 5)?.tabMs).toBe(4000))
})
