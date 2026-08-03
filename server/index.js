import express from 'express'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

import {
  initSchema,
  seedIfEmpty,
  ensureBootstrapAdmin,
  getState,
  setUserName,
  addCategory,
  updateCategory,
  removeCategory,
  addLink,
  updateLink,
  removeLink,
  listFavorites,
  addFavorite,
  updateFavorite,
  removeFavorite,
  listGroups,
  addGroup,
  removeGroup,
  setUserGroups,
  listUsers,
  listAllNews,
  listNewsForUser,
  addNews,
  removeNews,
  setBackground,
} from './db.js'
import {
  checkPassword,
  currentUser,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  requireAdmin,
  signState,
  readState,
  COOKIE_SECURE,
} from './auth.js'
import { buildLoginUrl, completeLogin, ssoConfigured, REDIRECT_ORIGIN } from './oauth.js'

await initSchema()
await seedIfEmpty()

// API_PORT wins in dev (avoids clashing with a PORT injected by tooling);
// PORT is used in production (Docker / most PaaS).
const PORT = process.env.API_PORT || process.env.PORT || 3001
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')

// Uploaded background images live under DATA_DIR so they share the mounted volume.
const DATA_DIR = process.env.DATA_DIR || './data'
const UPLOADS_DIR = join(DATA_DIR, 'uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

const BOOTSTRAP_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@parquetempisque.dev'
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173'
const OAUTH_COOKIE = 'lb_oauth'
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const UPLOAD_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

const app = express()
app.set('trust proxy', 1)
app.use(express.json())
app.use(cookieParser())

const api = express.Router()

// ---- public ---------------------------------------------------------------

api.get('/health', (_req, res) => res.json({ ok: true }))

api.get('/session', async (req, res) => {
  const user = await currentUser(req)
  res.json({ user })
})

// Password fallback → logs in as the bootstrap admin user.
api.post('/login', async (req, res) => {
  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' })
  }
  const user = await ensureBootstrapAdmin({ email: BOOTSTRAP_ADMIN_EMAIL })
  setSessionCookie(res, user.id)
  res.json({ user })
})

api.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

// ---- Microsoft SSO (Entra, single tenant) ---------------------------------

api.get('/auth/login', async (_req, res) => {
  if (!ssoConfigured) {
    return res.status(503).json({ error: 'SSO de Microsoft no está configurado' })
  }
  try {
    const { url, codeVerifier, state, nonce } = await buildLoginUrl()
    res.cookie(OAUTH_COOKIE, signState({ codeVerifier, state, nonce }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE,
      maxAge: 10 * 60 * 1000,
      path: '/',
    })
    res.redirect(url)
  } catch (e) {
    console.error('SSO init error:', e)
    res.redirect(`${APP_BASE_URL}/?error=sso_init`)
  }
})

api.get('/auth/callback', async (req, res) => {
  const saved = readState(req.cookies?.[OAUTH_COOKIE])
  res.clearCookie(OAUTH_COOKIE, { path: '/' })
  if (!saved) return res.redirect(`${APP_BASE_URL}/?error=sso_state`)
  try {
    const currentUrl = `${REDIRECT_ORIGIN}${req.originalUrl}`
    const user = await completeLogin(currentUrl, saved)
    setSessionCookie(res, user.id)
    res.redirect(`${APP_BASE_URL}/`)
  } catch (e) {
    console.error('SSO callback error:', e)
    res.redirect(`${APP_BASE_URL}/?error=sso`)
  }
})

// ---- protected (any signed-in user) ---------------------------------------

api.use(requireAuth)

api.get('/state', async (req, res) => res.json(await getState(req.user)))

api.put('/settings/name', async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'El nombre no puede estar vacío' })
  const user = await setUserName(req.user.id, name)
  res.json({ user })
})

// ---- favorites (owner-scoped) ---------------------------------------------

api.get('/favorites', async (req, res) => res.json(await listFavorites(req.user.id)))

api.post('/favorites', async (req, res) => {
  const { title, url, categoryId = null } = req.body ?? {}
  if (!url || !title) return res.status(400).json({ error: 'title y url son obligatorios' })
  res.status(201).json(await addFavorite(req.user.id, { title, url, categoryId }))
})

api.put('/favorites/:id', async (req, res) => {
  const fav = await updateFavorite(req.user.id, req.params.id, req.body ?? {})
  if (!fav) return res.status(404).json({ error: 'Favorito no encontrado' })
  res.json(fav)
})

api.delete('/favorites/:id', async (req, res) => {
  await removeFavorite(req.user.id, req.params.id)
  res.json({ ok: true })
})

// ---- news (read: general + the user's groups; admin sees all) -------------

api.get('/news', async (req, res) => {
  const news = req.user.role === 'admin'
    ? await listAllNews()
    : await listNewsForUser(req.user.id)
  res.json(news)
})

// ---- admin ----------------------------------------------------------------

// Workspace links
api.post('/links', requireAdmin, async (req, res) => {
  const { title, url, categoryId = null, groupIds = [] } = req.body ?? {}
  if (!url || !title) return res.status(400).json({ error: 'title y url son obligatorios' })
  res.status(201).json(await addLink({ title, url, categoryId, groupIds }))
})

api.put('/links/:id', requireAdmin, async (req, res) => {
  const link = await updateLink(req.params.id, req.body ?? {})
  if (!link) return res.status(404).json({ error: 'Enlace no encontrado' })
  res.json(link)
})

api.delete('/links/:id', requireAdmin, async (req, res) => {
  await removeLink(req.params.id)
  res.json({ ok: true })
})

// Categories (shared taxonomy, admin-managed)
api.post('/categories', requireAdmin, async (req, res) => {
  const { name, color } = req.body ?? {}
  if (!name || !color) return res.status(400).json({ error: 'name y color son obligatorios' })
  res.status(201).json(await addCategory({ name, color }))
})

api.put('/categories/:id', requireAdmin, async (req, res) => {
  const category = await updateCategory(req.params.id, req.body ?? {})
  if (!category) return res.status(404).json({ error: 'Categoría no encontrada' })
  res.json(category)
})

api.delete('/categories/:id', requireAdmin, async (req, res) => {
  await removeCategory(req.params.id)
  res.json({ ok: true })
})

// Groups
api.get('/groups', requireAdmin, async (_req, res) => res.json(await listGroups()))

api.post('/groups', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'El nombre del grupo es obligatorio' })
  res.status(201).json(await addGroup({ name }))
})

api.delete('/groups/:id', requireAdmin, async (req, res) => {
  await removeGroup(req.params.id)
  res.json({ ok: true })
})

api.get('/users', requireAdmin, async (_req, res) => res.json(await listUsers()))

api.put('/users/:id/groups', requireAdmin, async (req, res) => {
  const groupIds = Array.isArray(req.body?.groupIds) ? req.body.groupIds : []
  await setUserGroups(req.params.id, groupIds)
  res.json({ ok: true })
})

// News (publish / delete)
api.post('/news', requireAdmin, async (req, res) => {
  const { title, body, audience = 'general', groupId = null } = req.body ?? {}
  if (!title || !body) return res.status(400).json({ error: 'title y body son obligatorios' })
  if (audience === 'group' && !groupId) {
    return res.status(400).json({ error: 'Selecciona un grupo para una noticia segmentada' })
  }
  res.status(201).json(await addNews({ title, body, audience, groupId, authorId: req.user.id }))
})

api.delete('/news/:id', requireAdmin, async (req, res) => {
  await removeNews(req.params.id)
  res.json({ ok: true })
})

// ---- background (admin, global) -------------------------------------------

const BG_SOURCES = new Set(['default', 'unsplash', 'admin', 'collaborator'])

api.put('/settings/background', requireAdmin, async (req, res) => {
  const { source, url = null, credit = null } = req.body ?? {}
  if (!BG_SOURCES.has(source)) {
    return res.status(400).json({ error: 'Origen de imagen no válido' })
  }
  if (source !== 'default' && !url) {
    return res.status(400).json({ error: 'Falta la URL de la imagen' })
  }
  res.json(await setBackground({ source, url, credit }))
})

// Raw binary upload (application/octet-stream). ?type carries the MIME type.
api.post(
  '/uploads/background',
  requireAdmin,
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

// ---- unsplash proxy (admin; keeps the access key server-side) -------------

api.get('/unsplash/search', requireAdmin, async (req, res) => {
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

api.post('/unsplash/track', requireAdmin, async (req, res) => {
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
  console.log(`🚀 WinlinkHome escuchando en http://localhost:${PORT}`)
  if (!existsSync(DIST)) {
    console.log('ℹ  Sin build (dist/): modo API. Ejecuta el frontend con Vite en dev.')
  }
})
