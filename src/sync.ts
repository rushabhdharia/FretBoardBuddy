import type { ChordEvent } from './timeline'

/** media time = offset + stretch * tab time. stretch > 1 means the recording is slower than the tab. */
export type Sync = { offset: number; stretch: number }

export const tabToMedia = (s: Sync, tabSec: number) => s.offset + s.stretch * tabSec
export const mediaToTab = (s: Sync, mediaSec: number) => (mediaSec - s.offset) / s.stretch

/** First anchor: tab time `tabSec` happens at media time `t`. Keeps the current stretch. */
export const anchorFirst = (s: Sync, tabSec: number, t: number): Sync => ({ ...s, offset: t - s.stretch * tabSec })

/** Event whose onset is closest to a tab time. */
export function nearestEvent(events: ChordEvent[], tabSec: number): ChordEvent | undefined {
  return events.reduce<ChordEvent | undefined>(
    (best, e) => (!best || Math.abs(e.tabMs / 1000 - tabSec) < Math.abs(best.tabMs / 1000 - tabSec) ? e : best), undefined)
}

/**
 * Second anchor: tab time `a2` happens at media time `t2`. The first anchor stays where it is
 * (a1 at the current mapping), the stretch is solved from the two points.
 * Returns null when the points are too close or the result is implausible (> 25% tempo difference).
 */
export function anchorSecond(s: Sync, a1: number, a2: number, t2: number): Sync | null {
  if (a2 - a1 < 10) return null
  const t1 = tabToMedia(s, a1)
  const stretch = (t2 - t1) / (a2 - a1)
  if (stretch < 0.8 || stretch > 1.25) return null
  return { offset: t1 - stretch * a1, stretch }
}
