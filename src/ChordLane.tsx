import { useEffect, useRef, useState } from 'react'
import type { ChordEvent } from './timeline'
import type { Source } from './player/source'
import { createClock } from './clock'
import { mediaToTab, tabToMedia } from './sync'
import { ChordDiagram } from './ChordDiagram'
import type { Loop } from './loop'

const PX_PER_SEC = 90
const PLAYHEAD = 0.25 // fraction of lane width

type Props = {
  events: ChordEvent[]; source: Source | null; offsetSec: number; stretch: number; speed: number; capo: number
  loop: Loop | null; pendingA: number | null
  voicing: Record<string, number>; onVoicing: (chord: string, index: number) => void
}

/** Index of last event with tabMs <= ms, or -1. */
function indexAt(events: ChordEvent[], ms: number) {
  let lo = 0, hi = events.length - 1, ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (events[mid].tabMs <= ms) { ans = mid; lo = mid + 1 } else hi = mid - 1
  }
  return ans
}

export function ChordLane({ events, source, offsetSec, stretch, speed, capo, loop, pendingA, voicing, onVoicing }: Props) {
  const laneRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(-1)
  // latest props for the rAF loop and click handler, without restarting the loop
  const live = useRef({ events, source, offsetSec, stretch, speed })
  useEffect(() => { live.current = { events, source, offsetSec, stretch, speed } })

  useEffect(() => {
    let raf = 0
    const clock = createClock()
    const tick = () => {
      const { events, source, offsetSec, stretch, speed } = live.current
      if (source) {
        const t = clock(source, speed)
        const tabSec = mediaToTab({ offset: offsetSec, stretch }, t)
        if (trackRef.current) {
          const x = (laneRef.current?.clientWidth ?? 0) * PLAYHEAD - tabSec * PX_PER_SEC
          trackRef.current.style.transform = `translateX(${x}px)`
        }
        setCur(indexAt(events, tabSec * 1000))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const seekFromClick = (e: React.MouseEvent) => {
    const { source, offsetSec, stretch } = live.current
    const lane = laneRef.current
    if (!source || !lane) return
    const x = e.clientX - lane.getBoundingClientRect().left
    const sync = { offset: offsetSec, stretch }
    const tabSec = (x - lane.clientWidth * PLAYHEAD) / PX_PER_SEC + mediaToTab(sync, source.currentTime())
    source.seek(Math.max(0, tabToMedia(sync, tabSec)))
  }

  return (
    <div>
      <div className="now">
        <span className="big">{events[cur]?.chord ?? '–'}</span>
        {capo > 0 && <span className="capo">Capo {capo}</span>}
        {events[cur] && <ChordDiagram chord={events[cur].chord} index={voicing[events[cur].chord] ?? 0}
          onIndex={i => onVoicing(events[cur].chord, i)} />}
        <span className="next">next: {events[cur + 1]?.chord ?? '–'}</span>
        {events[cur + 1] && <ChordDiagram chord={events[cur + 1].chord} index={voicing[events[cur + 1].chord] ?? 0} small
          onIndex={i => onVoicing(events[cur + 1].chord, i)} />}
      </div>
      <div className="lane" ref={laneRef} onClick={seekFromClick}>
        <div className="playhead" style={{ left: `${PLAYHEAD * 100}%` }} />
        <div className="track" ref={trackRef}>
          {loop && <div className="loopband" style={{ left: loop.a * PX_PER_SEC, width: (loop.b - loop.a) * PX_PER_SEC }} />}
          {!loop && pendingA !== null && <div className="loopband loopA" style={{ left: pendingA * PX_PER_SEC }} />}
          {events.map((e, i) => {
            const end = events[i + 1]?.tabMs ?? e.tabMs + 2000
            return (
              <div key={i} className={`card${i === cur ? ' active' : ''}`}
                style={{ left: (e.tabMs / 1000) * PX_PER_SEC, width: ((end - e.tabMs) / 1000) * PX_PER_SEC - 4 }}>
                {e.chord}{e.orig && <small> ({e.orig})</small>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
