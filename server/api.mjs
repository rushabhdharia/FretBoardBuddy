import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const MAX_BODY = 500 * 1024 * 1024 // an mp3 is a few MB; this only stops runaway uploads

const isObj = x => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Connect-style middleware serving /api/* from a SQLite file. Calls next() for anything else. */
export function createApi(dbPath = 'data/fretboardbuddy.db') {
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (key TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS kv    (key TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS files (key TEXT PRIMARY KEY, data BLOB NOT NULL);
  `)
  const putSong = db.prepare('INSERT INTO songs (key, json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json')
  const putKv = db.prepare('INSERT INTO kv (key, json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json')
  const putFile = db.prepare('INSERT INTO files (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data')

  const readBody = req => new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', c => {
      size += c.length
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

  const send = (res, status, body, type = 'application/json') => {
    res.statusCode = status
    res.setHeader('content-type', type)
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
  }

  const state = () => ({
    songs: Object.fromEntries(db.prepare('SELECT key, json FROM songs').all().map(r => [r.key, JSON.parse(r.json)])),
    known: JSON.parse(db.prepare("SELECT json FROM kv WHERE key = 'known'").get()?.json ?? '[]'),
    voicing: JSON.parse(db.prepare("SELECT json FROM kv WHERE key = 'voicing'").get()?.json ?? '{}'),
  })

  return async function handle(req, res, next) {
    if (!req.url.startsWith('/api/')) return next()
    try {
      // Only this machine's own pages may talk to the API: blocks other sites and DNS rebinding.
      const host = (req.headers.host ?? '').replace(/:\d+$/, '')
      if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return send(res, 403, { error: 'forbidden host' })
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, { error: 'forbidden origin' })

      const path = req.url.split('?')[0].slice('/api/'.length).split('/')
      const [kind, rawKey] = path
      const key = rawKey === undefined ? undefined : decodeURIComponent(rawKey)

      if (req.method === 'GET' && kind === 'state') return send(res, 200, state())

      if (req.method === 'GET' && kind === 'files' && key) {
        const row = db.prepare('SELECT data FROM files WHERE key = ?').get(key)
        return row ? send(res, 200, Buffer.from(row.data), 'application/octet-stream') : send(res, 404, { error: 'not found' })
      }

      if (req.method === 'PUT') {
        const body = await readBody(req)
        if (kind === 'files' && key) { putFile.run(key, body); return send(res, 200, { ok: true }) }
        let json
        try { json = JSON.parse(body.toString('utf8')) } catch { return send(res, 400, { error: 'body is not JSON' }) }
        if (kind === 'songs' && key) {
          if (!isObj(json) || json.key !== key) return send(res, 400, { error: 'song key mismatch' })
          putSong.run(key, JSON.stringify(json))
        } else if (kind === 'known') {
          if (!Array.isArray(json) || !json.every(k => typeof k === 'string')) return send(res, 400, { error: 'known must be a string array' })
          putKv.run('known', JSON.stringify(json))
        } else if (kind === 'voicing') {
          if (!isObj(json) || !Object.values(json).every(v => typeof v === 'number')) return send(res, 400, { error: 'voicing must map chord to number' })
          putKv.run('voicing', JSON.stringify(json))
        } else return send(res, 404, { error: 'unknown endpoint' })
        return send(res, 200, { ok: true })
      }

      send(res, 404, { error: 'unknown endpoint' })
    } catch (e) {
      send(res, e.status ?? 500, { error: e.message })
    }
  }
}
