import { useEffect, useRef, useState } from 'react'
import * as alphaTab from '@coderline/alphatab'
import { createClock } from './clock'
import type { Source } from './player/source'
import { mediaToTab, tabToMedia } from './sync'
import { isChordTrack, msToTickFn, tickToMsFn } from './timeline'

type Props = { score: alphaTab.model.Score; source: Source | null; offsetSec: number; stretch: number; speed: number }

/** alphaTab renders the tab (no audio player). We draw our own playhead from its bounds lookup. */
export function TabView({ score, source, offsetSec, stretch, speed }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null)
  const [track, setTrack] = useState(() => Math.max(0, score.tracks.findIndex(t => isChordTrack(t) && t.staves[0].stringTuning.tunings.length === 6)))
  const live = useRef({ source, offsetSec, stretch, speed, score })
  useEffect(() => { live.current = { source, offsetSec, stretch, speed, score } })

  useEffect(() => {
    const api = new alphaTab.AlphaTabApi(hostRef.current!, {
      core: { useWorkers: false, fontDirectory: '/font/' },
      player: { enablePlayer: false },
      display: { staveProfile: alphaTab.StaveProfile.Tab },
    })
    apiRef.current = api
    return () => { api.destroy(); apiRef.current = null }
  }, [])

  useEffect(() => { apiRef.current?.renderScore(score, [track]) }, [score, track])

  // playhead
  useEffect(() => {
    let raf = 0, lastY = -1
    const clock = createClock()
    const toTick = msToTickFn(score)
    const loop = () => {
      const { source, offsetSec, stretch, speed } = live.current
      const lookup = apiRef.current?.boundsLookup
      const head = headRef.current
      if (source && lookup && head) {
        const tick = toTick(mediaToTab({ offset: offsetSec, stretch }, clock(source, speed)) * 1000)
        const idx = tick < 0 ? -1 : score.masterBars.findLastIndex(m => m.start <= tick)
        const mb = idx >= 0 ? lookup.findMasterBarByIndex(idx) : null
        const beats = mb?.bars[0]?.beats
        if (mb && beats?.length) {
          const j = Math.max(0, beats.findLastIndex(b => b.beat.absolutePlaybackStart <= tick))
          const b = beats[j]
          const x1 = beats[j + 1]?.onNotesX ?? mb.realBounds.x + mb.realBounds.w
          const frac = Math.min(1, Math.max(0, (tick - b.beat.absolutePlaybackStart) / b.beat.playbackDuration))
          head.style.display = 'block'
          head.style.transform = `translateX(${b.onNotesX + (x1 - b.onNotesX) * frac}px)`
          head.style.top = `${mb.realBounds.y}px`
          head.style.height = `${mb.realBounds.h}px`
          if (mb.realBounds.y !== lastY) { // new staff system: scroll it into view
            lastY = mb.realBounds.y
            wrapRef.current?.scrollTo({ top: Math.max(0, lastY - 10), behavior: 'smooth' })
          }
        } else head.style.display = 'none'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const seek = (e: React.MouseEvent) => {
    const { source, offsetSec, stretch, score } = live.current
    const lookup = apiRef.current?.boundsLookup
    if (!source || !lookup) return
    const r = hostRef.current!.getBoundingClientRect()
    const beat = lookup.getBeatAtPos(e.clientX - r.left, e.clientY - r.top)
    if (beat) source.seek(Math.max(0, tabToMedia({ offset: offsetSec, stretch }, tickToMsFn(score)(beat.absolutePlaybackStart) / 1000)))
  }

  return (
    <section>
      <label>Track <select value={track} onChange={e => setTrack(Number(e.target.value))}>
        {score.tracks.map((t, i) => !t.staves[0].isPercussion && (
          <option key={i} value={i}>{t.name.split('\n')[0].slice(0, 50)}</option>
        ))}
      </select></label>
      <div className="tabwrap" ref={wrapRef}>
        <div ref={hostRef} onClick={seek} />
        <div className="tabhead" ref={headRef} />
      </div>
    </section>
  )
}
