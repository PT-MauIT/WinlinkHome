import express from 'express'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

import {
  seedIfEmpty,
  getState,
  addLink,
  updateLink,
  removeLink,
  addCategory,
  updateCategory,
  removeCategory,
  setSetting,
  setBackground,
} from './db.js'
import {
  checkPassword,
  isAuthed,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} from './auth.js'

seedIfEmpty()

// API_PORT wins in dev (avoids clashing with a PORT injected by tooling);
// PORT is used in production (Docker / most PaaS).
const PORT = process.env.API_PORT || process.env.PORT || 3001
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')

// Uploaded background images live next to the SQLite file so they share the
// same mounted volume and survive redeploys.
const DB_PATH = process.env.DB_PATH || './data/linkboard.db'
const UPLOADS_DIR = join(dirname(DB_PATH), 'uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const UPLOAD_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

const app = express()
app.set('trust proxy', 1)
app.use(express.json())
app.use(cookieParser())

const api = express.Router()

// ---- public ---------------------------------------------------------------

api.get('/health', (_req, res) => res.json({ ok: true }))

api.get('/session', (req, res) => res.json({ authenticated: isAuthed(req) }))

api.post('/login', (req, res) => {
  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' })
  }
  setSessionCookie(res)
  res.json({ ok: true })
})

api.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

// ---- protected ------------------------------------------------------------

api.use(requireAuth)

api.get('/state', (_req, res) => res.json(getState()))

api.put('/settings/name', (req, res) => {
  const name = String(req.body?.name ?? '').trim() || 'amigo'
  setSetting('userName', name)
  res.json({ userName: name })
})

// ---- background -----------------------------------------------------------

const BG_SOURCES = new Set(['default', 'unsplash', 'admin', 'collaborator'])

api.put('/settings/background', (req, res) => {
  const { source, url = null, credit = null } = req.body ?? {}
  if (!BG_SOURCES.has(source)) {
    return res.status(400).json({ error: 'Origen de imagen no válido' })
  }
  if (source !== 'default' && !url) {
    return res.status(400).json({ error: 'Falta la URL de la imagen' })
  }
  res.json(setBackground({ source, url, credit }))
})

// Raw binary upload (application/octet-stream) so we don't pay the ~33% base64
// tax and can keep the JSON body limit small. ?type carries the MIME type.
api.post(
  '/uploads/background',
  express.raw({ type: 'application/octet-stream', limit: '12mb' }),
  (req, res) => {
    const ext = UPLOAD_EXT[String(req.query.type)]
    if (!ext) return res.status(415).json({ error: 'Formato no soportado (usa JPG, PNG, WEBP o GIF)' })
    if (!req.body?.length) return res.status(400).json({ error: 'Archivo vacío' })

    const name = `bg-${randomUUID()}.${ext}`
    writeFileSync(join(UPLOADS_DIR, name), req.body)
    res.status(201).json({ url: `/uploads/${name}` })
  },
)

// ---- unsplash proxy (keeps the access key server-side) --------------------

api.get('/unsplash/search', async (req, res) => {
  if (!UNSPLASH_KEY) {
    return res.status(503).json({ error: 'Unsplash no está configurado (falta UNSPLASH_ACCESS_KEY)' })
  }
  const query = String(req.query.query ?? '').trim() || 'nature'
  const page = Number(req.query.page) || 1
  try {
    const url = new URL('https://api.unsplash.com/search/photos')
    url.searchParams.set('query', query)
    url.searchParams.set('page', String(page))
    url.searchParams.set('per_page', '12')
    url.searchParams.set('orientation', 'landscape')
    const r = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } })
    if (!r.ok) return res.status(502).json({ error: 'Error consultando Unsplash' })
    const data = await r.json()
    const results = (data.results ?? []).map((p) => ({
      id: p.id,
      thumb: p.urls?.thumb,
      full: p.urls?.regular,
      credit: `${p.user?.name} · Unsplash`,
      downloadLocation: p.links?.download_location ?? null,
    }))
    res.json({ results })
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: 'Error consultando Unsplash' })
  }
})

// Unsplash API guidelines require pinging download_location when a photo is used.
api.post('/unsplash/track', async (req, res) => {
  const loc = req.body?.downloadLocation
  if (UNSPLASH_KEY && loc) {
    try {
      await fetch(loc, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } })
    } catch (e) {
      console.error(e)
    }
  }
  res.json({ ok: true })
})

api.post('/links', (req, res) => {
  const { title, url, categoryId = null } = req.body ?? {}
  if (!url || !title) return res.status(400).json({ error: 'title y url son obligatorios' })
  res.status(201).json(addLink({ title, url, categoryId }))
})

api.put('/links/:id', (req, res) => {
  const link = updateLink(req.params.id, req.body ?? {})
  if (!link) return res.status(404).json({ error: 'Enlace no encontrado' })
  res.json(link)
})

api.delete('/links/:id', (req, res) => {
  removeLink(req.params.id)
  res.json({ ok: true })
})

api.post('/categories', (req, res) => {
  const { name, color } = req.body ?? {}
  if (!name || !color) return res.status(400).json({ error: 'name y color son obligatorios' })
  res.status(201).json(addCategory({ name, color }))
})

api.put('/categories/:id', (req, res) => {
  const category = updateCategory(req.params.id, req.body ?? {})
  if (!category) return res.status(404).json({ error: 'Categoría no encontrada' })
  res.json(category)
})

api.delete('/categories/:id', (req, res) => {
  removeCategory(req.params.id)
  res.json({ ok: true })
})

app.use('/api', api)

// ---- uploaded background images -------------------------------------------

app.use('/uploads', express.static(UPLOADS_DIR))

// ---- static frontend (production) -----------------------------------------

if (existsSync(DIST)) {
  app.use(express.static(DIST))
  // SPA fallback for any non-API route
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(join(DIST, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`🚀 LinkBoard escuchando en http://localhost:${PORT}`)
  if (!existsSync(DIST)) {
    console.log('ℹ  Sin build (dist/): modo API. Ejecuta el frontend con Vite en dev.')
  }
})
