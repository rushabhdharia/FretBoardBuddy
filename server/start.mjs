// Serves the built app (dist/) and the SQLite API. Run via `npm start`.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApi } from './api.mjs'

const dist = join(fileURLToPath(new URL('..', import.meta.url)), 'dist')
const port = Number(process.env.PORT ?? 4173)
const api = createApi(process.env.FBB_DB ?? 'data/fretboardbuddy.db')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain' }

createServer((req, res) => api(req, res, () => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = join(dist, normalize(url))
  if (!file.startsWith(dist)) { res.statusCode = 403; return res.end() }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html')
  res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(res)
})).listen(port, '127.0.0.1', () => console.log(`FretBoardBuddy: http://localhost:${port}/  (data in ${process.env.FBB_DB ?? 'data/fretboardbuddy.db'})`))
