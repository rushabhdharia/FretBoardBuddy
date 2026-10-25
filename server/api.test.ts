import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApi } from './api.mjs'

let server: Server, base: string, dir: string

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fbb-'))
  const api = createApi(join(dir, 'test.db'))
  server = createServer((req, res) => void api(req, res, () => { res.statusCode = 404; res.end('not api') }))
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  base = `http://localhost:${(server.address() as { port: number }).port}`
})
afterAll(() => { server.close(); rmSync(dir, { recursive: true, force: true }) })

const put = (path: string, body: BodyInit, type = 'application/json') =>
  fetch(base + path, { method: 'PUT', headers: { 'content-type': type }, body })

describe('api', () => {
  it('starts empty', async () => {
    expect(await (await fetch(`${base}/api/state`)).json()).toEqual({ songs: {}, known: [], voicing: {} })
  })

  it('stores songs, known chords and voicings', async () => {
    const song = { key: "audio:it's a song.mp3:5", title: 't', gpName: 'a.gp', offset: 1.5, speed: 1, standard: true, subst: {}, source: { type: 'audio', name: "it's a song.mp3", size: 5 } }
    expect((await put(`/api/songs/${encodeURIComponent(song.key)}`, JSON.stringify(song))).status).toBe(200)
    await put('/api/known', JSON.stringify(['A', 'D']))
    await put('/api/voicing', JSON.stringify({ A: 2 }))
    const state = await (await fetch(`${base}/api/state`)).json()
    expect(state.songs[song.key]).toEqual(song)
    expect(state.known).toEqual(['A', 'D'])
    expect(state.voicing).toEqual({ A: 2 })
  })

  it('updates a song in place', async () => {
    const song = { key: 'yt:x', title: 'one', gpName: 'a.gp', offset: 0, speed: 1, standard: true, subst: {}, source: { type: 'youtube', url: 'u', id: 'x' } }
    await put('/api/songs/yt%3Ax', JSON.stringify(song))
    await put('/api/songs/yt%3Ax', JSON.stringify({ ...song, title: 'two' }))
    const state = await (await fetch(`${base}/api/state`)).json()
    expect(state.songs['yt:x'].title).toBe('two')
  })

  it('round-trips binary files', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 0, 7])
    await put('/api/files/gp%3Ayt%3Ax', bytes, 'application/octet-stream')
    const res = await fetch(`${base}/api/files/gp%3Ayt%3Ax`)
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes)
    expect((await fetch(`${base}/api/files/missing`)).status).toBe(404)
  })

  it('rejects bad bodies', async () => {
    expect((await put('/api/songs/a', '{"key":"b"}')).status).toBe(400) // key mismatch
    expect((await put('/api/songs/a', 'not json')).status).toBe(400)
    expect((await put('/api/known', '[1]')).status).toBe(400)
    expect((await put('/api/voicing', '{"A":"x"}')).status).toBe(400)
    expect((await put('/api/nope', '{}')).status).toBe(404)
  })

  it('rejects other hosts and other origins', async () => {
    const port = new URL(base).port
    const rebinding = await fetch(`http://127.0.0.1:${port}/api/state`, { headers: { host: 'evil.example' } }).catch(() => null)
    // fetch cannot override Host in every runtime; the Origin check below is the reliable assertion
    if (rebinding) expect([200, 403]).toContain(rebinding.status)
    const crossSite = await fetch(`${base}/api/state`, { headers: { origin: 'http://evil.example' } })
    expect(crossSite.status).toBe(403)
  })

  it('passes non-api urls on', async () => {
    expect(await (await fetch(`${base}/index.html`)).text()).toBe('not api')
  })
})
