import { nearestEvent } from './sync'
import type { ChordEvent } from './timeline'

/** A-B loop in tab seconds, so it survives changes to offset and stretch. */
export type Loop = { a: number; b: number }

/** A goes to the nearest chord start. */
export function snapA(events: ChordEvent[], tabSec: number): number | undefined {
  const e = nearestEvent(events, tabSec)
  return e ? e.tabMs / 1000 : undefined
}

/**
 * B goes to the first chord start at or after the current spot, so the chord you are on stays in the loop.
 * The 0.25s grace covers pressing a moment after a chord has begun.
 */
export function snapB(events: ChordEvent[], tabSec: number): number | undefined {
  const next = events.find(e => e.tabMs / 1000 >= tabSec - 0.25)
  return next ? next.tabMs / 1000 : undefined
}

export const makeLoop = (a: number, b: number): Loop | null => (b > a ? { a, b } : null)

/** Wrap only just past the end: a deliberate seek far beyond B is left alone. */
export const shouldWrap = (loop: Loop, tabSec: number) => tabSec >= loop.b && tabSec < loop.b + 1.5
