import type { Source } from './player/source'

/** Media time that advances smoothly between coarse player polls. Create one per consumer. */
export function createClock() {
  let last = NaN, wall = 0
  return (source: Source, speed: number) => {
    const now = performance.now()
    const v = source.currentTime()
    if (v !== last) { last = v; wall = now }
    return source.playing() ? last + ((now - wall) / 1000) * speed : last
  }
}
