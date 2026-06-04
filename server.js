// Production web server for hosts that run a persistent Node process (Render,
// Railway, Fly, a VPS, etc.) instead of Vercel-style serverless functions.
//
// It does two jobs:
//   1. Serves the built front-end from dist/ (run `npm run build` first).
//   2. Exposes the same /api/state endpoint, reusing the existing handler in
//      api/state.js verbatim — its (req, res) signature is Express-compatible.
//
// Locally:  npm run build && npm start   ->  http://localhost:3000
// On Render: build `npm install && npm run build`, start `npm start`.

import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, 'dist')

// Load .env.local for local runs ONLY (it's gitignored and absent on Render,
// where real env vars are injected by the dashboard — those always win).
const envFile = path.join(__dirname, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
    if (m && !line.trimStart().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

// Imported AFTER env is loaded, since api/state.js reads process.env at import.
const { default: handler } = await import('./api/state.js')

const app = express()
app.use(express.json())

// Shared draw + live scores (GET read / POST admin-write). Mounted before the
// static + SPA fallback so it always wins.
app.all('/api/state', (req, res) => handler(req, res))

// Static front-end, then SPA fallback so client routes resolve to index.html.
app.use(express.static(dist))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`PAHN World Cup app listening on :${port}`))
