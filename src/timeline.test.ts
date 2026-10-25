import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { importer } from '@coderline/alphatab'

const { ScoreLoader } = importer
import { detectChord } from './detect'
import { buildTimeline, msToTickFn, tickToMsFn } from './timeline'

const pcs = (...p: number[]) => new Map(p.map(x => [x, 1]))

describe('detectChord', () => {
  it('names triads', () => {
    expect(detectChord(pcs(9, 0, 4))).toBe('Am')
    expect(detectChord(pcs(2, 6, 9))).toBe('D')
    expect(detectChord(pcs(4, 8, 11, 2))).toBe('E')
  })
  it('power chord collapses to major', () => expect(detectChord(pcs(9, 4))).toBe('A'))
  it('ignores faint passing notes', () => {
    const w = new Map([[9, 4], [0, 4], [4, 4], [1, 0.5]])
    expect(detectChord(w)).toBe('Am')
  })
})

const tex = `\\tempo 120 \\tuning e5 b4 g4 d4 a3 e3 .
:4 (0.1 2.2 2.3){ch "Am"} 2.2 2.3 3.4 |
\\tempo 60 (3.1 0.2 0.3){ch "D"} 2.2 2.3 3.4 |`

describe('timeline', () => {
  const score = ScoreLoader.loadAlphaTex(tex)
  it('tick->ms follows tempo changes', () => {
    const ms = tickToMsFn(score)
    expect(ms(3840)).toBeCloseTo(2000) // 4 beats @120
    expect(ms(3840 + 960)).toBeCloseTo(3000) // +1 beat @60
  })
  it('ms->tick inverts tick->ms', () => {
    const toMs = tickToMsFn(score), toTick = msToTickFn(score)
    for (const t of [0, 1000, 3840, 5000, 9000]) expect(toTick(toMs(t))).toBeCloseTo(t)
  })
  it('uses labels', () => {
    const ev = buildTimeline(score)
    expect(ev.map(e => e.chord)).toEqual(['Am', 'D'])
    expect(ev[1].tabMs).toBeCloseTo(2000)
  })
})

const GPS = ["o-o-jane-jana.gp", "Knockin' On Heaven's Door.gp"].filter(existsSync)
describe.skipIf(!GPS.length).each(GPS)('local GP fixture %s', gp => {
  it('prints detected timeline', () => {
    const score = ScoreLoader.loadScoreFromBytes(new Uint8Array(readFileSync(gp)))
    const ev = buildTimeline(score, { standardTuning: true })
    console.log('TL', gp, ev.map(e => `${(e.tabMs / 1000).toFixed(1)}s ${e.chord}`).join(' | '))
    expect(ev.length).toBeGreaterThan(0)
  })
})
