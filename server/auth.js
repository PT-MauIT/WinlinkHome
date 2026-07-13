import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getUserById } from './db.js'

const PASSWORD = process.env.APP_PASSWORD || 'changeme'
const SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex')
const COOKIE_NAME = 'lb_session'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
export const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

/** True if the email should be provisioned with the admin role. */
export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase())
}

if (!process.env.APP_PASSWORD) {
  console.warn('⚠  APP_PASSWORD no definida — usando "changeme". Configúrala en producción.')
}
if (!process.env.SESSION_SECRET) {
  console.warn('⚠  SESSION_SECRET no definida — se generó una temporal (las sesiones se invalidan al reiniciar).')
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

function sign(payloadStr) {
  return createHmac('sha256', SECRET).update(payloadStr).digest('base64url')
}

/** Constant-time string comparison. */
function safeEqual(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function checkPassword(input) {
  return typeof input === 'string' && safeEqual(input, PASSWORD)
}

// ---- signed session token: { uid, exp } -----------------------------------

export function createToken(uid) {
  const payload = b64url(JSON.stringify({ uid, exp: Date.now() + MAX_AGE_MS }))
  return `${payload}.${sign(payload)}`
}

/** Returns the decoded payload ({ uid, exp }) or null if invalid/expired. */
export function readToken(token) {
  if (!token || typeof token !== 'string') return null
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return null
  if (!safeEqual(mac, sign(payload))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.exp !== 'number' || data.exp <= Date.now()) return null
    return data
  } catch {
    return null
  }
}

export function setSessionCookie(res, uid) {
  res.cookie(COOKIE_NAME, createToken(uid), {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

/** Resolve the logged-in user from the session cookie, or null. */
export async function currentUser(req) {
  const data = readToken(req.cookies?.[COOKIE_NAME])
  if (!data?.uid) return null
  try {
    return await getUserById(data.uid)
  } catch {
    return null
  }
}

export async function requireAuth(req, res, next) {
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'No autorizado' })
    req.user = user
    next()
  } catch (e) {
    next(e)
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Requiere permisos de administrador' })
  }
  next()
}

// ---- short-lived signed cookies (OAuth state/verifier) --------------------

/** Sign an arbitrary short-lived payload object into a cookie-safe string. */
export function signState(obj) {
  const payload = b64url(JSON.stringify({ ...obj, exp: Date.now() + 10 * 60 * 1000 }))
  return `${payload}.${sign(payload)}`
}

export function readState(token) {
  return readToken(token) // same envelope (checks signature + exp)
}
