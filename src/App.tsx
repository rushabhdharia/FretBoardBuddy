import { useEffect, useMemo, useRef, useState } from 'react'
import { importer, type model } from '@coderline/alphatab'
import { ChordLane } from './ChordLane'
import { ChordPanel } from './ChordPanel'
import { TabView } from './TabView'
import { createAudioSource } from './player/AudioSource'
import type { Source } from './player/source'
import { createYouTubeSource, parseVideoId } from './player/YouTubeSource'
import { applySubst, autoSubst } from './subst'
import { anchorFirst, anchorSecond, mediaToTab, nearestEvent } from './sync'
import { getBlob, loadKnown, loadSongs, loadVoicing, putBlob, saveKnown, saveSong, saveVoicing, songKey, type SongSource } from './store'
import { buildTimeline, standardTuningShift } from './timeline'
import './App.css'

const SPEEDS = [0.25, 0.5, 0.75, 1]
const NUDGES = [-0.1, -0.01, 0.01, 0.1]

export default function App() {
  const [score, setScore] = useState<model.Score | null>(null)
  const [gpFile, setGpFile] = useState<File | null>(null)
  const [standard, setStandard] = useState(true)
  const [source, setSource] = useState<Source | null>(null)
  const [srcInfo, setSrcInfo] = useState<SongSource | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [speed, setSpeed] = useState(1)
  const [offset, setOffset] = useState(0)
  const [stretch, setStretch] = useState(1)
  const [syncMsg, setSyncMsg] = useState('')
  const [subst, setSubst] = useState<Record<string, string>>({})
  const [known, setKnown] = useState<string[]>(loadKnown)
  const [saved, setSaved] = useState(loadSongs)
  const [voicing, setVoicing] = useState(loadVoicing)
  const [showTab, setShowTab] = useState(false)
  const videoHost = useRef<HTMLDivElement>(null)

  const events = useMemo(() => (score ? buildTimeline(score, { standardTuning: standard }) : []), [score, standard])
  const shown = useMemo(() => applySubst(events, subst), [events, subst])
  const shift = score ? standardTuningShift(score) : 0
  const key = srcInfo && songKey(srcInfo)

  useEffect(() => () => source?.destroy(), [source])
  useEffect(() => source?.setRate(speed), [source, speed])
  useEffect(() => saveKnown(known), [known])
  useEffect(() => saveVoicing(voicing), [voicing])

  // persist per-song settings and the tab file once both a source and a tab are loaded
  useEffect(() => {
    if (!srcInfo || !key || !gpFile) return
    saveSong({ key, title: gpFile.name.replace(/\.gp\w*$/, ''), source: srcInfo, gpName: gpFile.name, offset, stretch, speed, standard, subst })
    setSaved(loadSongs())
  }, [key, srcInfo, gpFile, offset, stretch, speed, standard, subst])
  useEffect(() => { if (key && gpFile) void putBlob(`gp:${key}`, gpFile) }, [key, gpFile])

  const loadScore = async (file: File) => {
    try {
      setScore(importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(await file.arrayBuffer())))
      setGpFile(file)
      setError('')
    } catch (e) { setError(`Cannot read tab: ${(e as Error).message}`) }
  }

  // new source: reuse settings saved for it, else start clean
  const adopt = (info: SongSource) => {
    const s = loadSongs()[songKey(info)]
    setSrcInfo(info)
    setOffset(s?.offset ?? 0)
    setStretch(s?.stretch ?? 1)
    setSyncMsg('')
    setSpeed(s?.speed ?? 1)
    setSubst(s?.subst ?? {})
    if (s) setStandard(s.standard)
    return s
  }

  const startYouTube = async (id: string, link: string) => {
    setSource(null)
    const el = document.createElement('div') // YT.Player replaces its target element
    videoHost.current!.replaceChildren(el)
    try { setSource(await createYouTubeSource(el, id)); setError('') }
    catch (e) { setError((e as Error).message) }
    return { type: 'youtube', url: link, id } satisfies SongSource
  }

  const loadYouTube = async () => {
    const id = parseVideoId(url)
    if (!id) return setError('Not a YouTube link')
    adopt({ type: 'youtube', url, id })
    await startYouTube(id, url)
  }

  const startAudio = (file: File) => {
    videoHost.current!.replaceChildren()
    setSource(createAudioSource(file))
    setError('')
  }

  const loadAudio = (file: File) => {
    adopt({ type: 'audio', name: file.name, size: file.size })
    void putBlob(`audio:${file.name}:${file.size}`, file)
    startAudio(file)
  }

  const openSaved = async (k: string) => {
    const s = loadSongs()[k]
    if (!s) return
    const gp = await getBlob(`gp:${k}`)
    if (gp) await loadScore(new File([gp], s.gpName))
    adopt(s.source)
    if (s.source.type === 'youtube') { setUrl(s.source.url); await startYouTube(s.source.id, s.source.url) }
    else {
      const blob = await getBlob(k)
      if (blob) startAudio(new File([blob], s.source.name))
      else setError('Audio file missing from browser storage. Pick the mp3 again.')
    }
  }

  // "Chords start here": first chord's onset lines up with the current media time.
  const tapSync = () => {
    if (!source || !events.length) return
    setOffset(anchorFirst({ offset, stretch }, events[0].tabMs / 1000, source.currentTime()).offset)
    setSyncMsg('')
  }

  // Second tap, late in the song: the chord that just started fixes tempo drift.
  // ponytail: picks the chord whose onset is nearest the current position, so drift must be under half a chord by now.
  const tapDrift = () => {
    if (!source || !events.length) return
    const t = source.currentTime()
    const sync = { offset, stretch }
    const target = nearestEvent(events, mediaToTab(sync, t))
    const next = target && anchorSecond(sync, events[0].tabMs / 1000, target.tabMs / 1000, t)
    if (!next) return setSyncMsg('Too close to the first chord (need 10s+), or tempo differs by over 25%. Try a later chord change.')
    setOffset(next.offset)
    setStretch(next.stretch)
    setSyncMsg(`Tempo adjusted: recording is ${((next.stretch - 1) * 100).toFixed(1)}% ${next.stretch > 1 ? 'slower' : 'faster'} than the tab.`)
  }

  return (
    <main>
      <h1>FretBoardBuddy</h1>
      {Object.keys(saved).length > 0 && (
        <section className="row">
          <label>Saved songs <select value="" onChange={e => void openSaved(e.target.value)}>
            <option value="">open…</option>
            {Object.values(saved).map(s => <option key={s.key} value={s.key}>{s.title} · {s.source.type === 'youtube' ? s.source.url : s.source.name}</option>)}
          </select></label>
        </section>
      )}
      <section className="row">
        <label>Tab (.gp) <input type="file" accept=".gp,.gp3,.gp4,.gp5,.gpx" onChange={e => e.target.files?.[0] && void loadScore(e.target.files[0])} /></label>
        {shift !== 0 && (
          <label><input type="checkbox" checked={standard} onChange={e => setStandard(e.target.checked)} /> Standard-tuning shapes (file is {Math.abs(shift)} semitone{Math.abs(shift) > 1 ? 's' : ''} {shift > 0 ? 'down' : 'up'})</label>
        )}
      </section>
      <section className="row">
        <input placeholder="YouTube link" value={url} onChange={e => setUrl(e.target.value)} size={40} />
        <button onClick={() => void loadYouTube()}>Load video</button>
        <label>or mp3 <input type="file" accept="audio/*" onChange={e => e.target.files?.[0] && loadAudio(e.target.files[0])} /></label>
      </section>
      {error && <p className="error">{error}</p>}

      <div className="video" ref={videoHost} />

      <ChordLane events={shown} source={source} offsetSec={offset} stretch={stretch} speed={speed}
        voicing={voicing} onVoicing={(c, i) => setVoicing(v => ({ ...v, [c]: i }))} />

      <section className="row">
        <button disabled={!source} onClick={() => (source!.playing() ? source!.pause() : source!.play())}>Play / Pause</button>
        <label>Speed {SPEEDS.map(s => (
          <button key={s} className={s === speed ? 'on' : ''} onClick={() => setSpeed(s)}>{s}x</button>
        ))}</label>
      </section>
      <section className="row">
        <button disabled={!source || !events.length} onClick={tapSync}>Chords start here</button>
        <button disabled={!source || !events.length} onClick={tapDrift}>This chord just started (fix drift)</button>
        {stretch !== 1 && <button onClick={() => { setStretch(1); setSyncMsg('') }}>Reset drift</button>}
        <span>offset {offset.toFixed(2)}s{stretch !== 1 && ` · stretch ${stretch.toFixed(4)}`}</span>
        {NUDGES.map(n => (
          <button key={n} onClick={() => setOffset(o => o + n)}>{n > 0 ? '+' : ''}{n * 1000}ms</button>
        ))}
      </section>
      {syncMsg && <p className="hint">{syncMsg}</p>}
      <p className="hint">Sync: pause right when the first chord sounds and press "Chords start here". If chords drift later, press "This chord just started" exactly when a chord change sounds, 10+ seconds in (the later, the more accurate).</p>

      {score && (
        <>
          <label><input type="checkbox" checked={showTab} onChange={e => setShowTab(e.target.checked)} /> Show tab</label>
          {showTab && <TabView score={score} source={source} offsetSec={offset} stretch={stretch} speed={speed} />}
        </>
      )}

      <ChordPanel events={events} known={known} subst={subst} onKnown={setKnown} onSubst={setSubst}
        onAuto={() => setSubst(autoSubst(events, known))} />
    </main>
  )
}
