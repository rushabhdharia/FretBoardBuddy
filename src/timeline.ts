import type { model } from '@coderline/alphatab'

type Beat = model.Beat
type Score = model.Score
type Track = model.Track
import { detectChord } from './detect'

export type ChordEvent = { tabMs: number; chord: string; source: 'label' | 'detected'; orig?: string }

const TICKS_PER_QUARTER = 960
const WINDOW_TICKS = TICKS_PER_QUARTER * 2 // ponytail: fixed half-note windows, switch to per-beat if chords change faster

/** Tempo changes as (tick, bpm) points, including mid-bar automations. */
function tempoPoints(score: Score) {
  const points: { tick: number; bpm: number }[] = [{ tick: 0, bpm: score.tempo }]
  for (const mb of score.masterBars)
    for (const a of mb.tempoAutomations)
      points.push({ tick: mb.start + a.ratioPosition * mb.calculateDuration(), bpm: a.value })
  return points.sort((a, b) => a.tick - b.tick)
}
const msPerTick = (bpm: number) => 60000 / (bpm * TICKS_PER_QUARTER)

/** Returns tick -> ms (at 100% speed) honoring tempo automations. */
export function tickToMsFn(score: Score): (tick: number) => number {
  const points = tempoPoints(score)
  return tick => {
    let ms = 0
    for (let i = 0; i < points.length; i++) {
      const end = Math.min(tick, points[i + 1]?.tick ?? Infinity)
      if (end > points[i].tick) ms += (end - points[i].tick) * msPerTick(points[i].bpm)
      if (end === tick) break
    }
    return ms
  }
}

/** Inverse of tickToMsFn. */
export function msToTickFn(score: Score): (ms: number) => number {
  const points = tempoPoints(score)
  return ms => {
    let acc = 0
    for (let i = 0; i < points.length; i++) {
      const segMs = ((points[i + 1]?.tick ?? Infinity) - points[i].tick) * msPerTick(points[i].bpm)
      if (ms < acc + segMs) return points[i].tick + (ms - acc) / msPerTick(points[i].bpm)
      acc += segMs
    }
    return 0
  }
}

// GM programs 24-39 = guitars + basses. Vocals, piano, leads etc. pollute chord detection.
export const isChordTrack = (t: Track) => !t.staves[0].isPercussion && t.playbackInfo.program >= 24 && t.playbackInfo.program <= 39

/** Semitones to add so sounding pitches become shapes in standard tuning (e.g. half-step-down file -> +1). */
export function standardTuningShift(score: Score): number {
  const guitar = score.tracks.find(t => isChordTrack(t) && t.staves[0].stringTuning.tunings.length === 6)
  return guitar ? 40 - Math.min(...guitar.staves[0].stringTuning.tunings) : 0
}

export function buildTimeline(score: Score, { ignoreLabels = false, standardTuning = false } = {}): ChordEvent[] {
  const shift = standardTuning ? standardTuningShift(score) : 0
  const toMs = tickToMsFn(score)
  const events: ChordEvent[] = []
  const push = (tick: number, chord: string, source: ChordEvent['source']) => {
    if (events.at(-1)?.chord !== chord) events.push({ tabMs: toMs(tick), chord, source })
  }

  const picked = score.tracks.filter(isChordTrack)
  // fall back to every pitched track when no guitar/bass is tagged
  const chordTracks = picked.length ? picked : score.tracks.filter(t => !t.staves[0].isPercussion)
  const pitchedBeats = (bar: number): Beat[] =>
    chordTracks.flatMap(t => t.staves[0].bars[bar].voices[0].beats)

  // ponytail: a score with any labels is trusted as fully labeled (label holds until next label); detection only for unlabeled scores
  const labeled = !ignoreLabels && score.tracks.some(t => t.staves[0].bars.some(b => b.voices[0].beats.some(bt => bt.chord)))

  score.masterBars.forEach((mb, bar) => {
    const beats = pitchedBeats(bar)
    for (let w = 0; w < mb.calculateDuration(); w += WINDOW_TICKS) {
      const inWin = beats.filter(b => b.playbackStart >= w && b.playbackStart < w + WINDOW_TICKS)
      const label = ignoreLabels ? undefined : inWin.find(b => b.chord)?.chord?.name
      if (label) { push(mb.start + w, label, 'label'); continue }
      if (labeled) continue
      const weights = new Map<number, number>()
      let bass = Infinity
      for (const b of inWin) for (const n of b.notes) {
        if (n.isDead) continue
        const pc = (n.realValue + shift + 120) % 12
        weights.set(pc, (weights.get(pc) ?? 0) + b.playbackDuration)
        bass = Math.min(bass, n.realValue + shift)
      }
      const chord = detectChord(weights, bass === Infinity ? undefined : bass % 12)
      if (chord) push(mb.start + w, chord, 'detected')
    }
  })
  return events
}
