import express from 'express'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

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
