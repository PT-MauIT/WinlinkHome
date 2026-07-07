import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const PASSWORD = process.env.APP_PASSWORD || 'changeme'
const SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex')
const COOKIE_NAME = 'lb_session'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
export const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'

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

export function createToken() {
  const payload = b64url(JSON.stringify({ exp: Date.now() + MAX_AGE_MS }))
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return false
  if (!safeEqual(mac, sign(payload))) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

export function isAuthed(req) {
  return verifyToken(req.cookies?.[COOKIE_NAME])
}

export function setSessionCookie(res) {
  res.cookie(COOKIE_NAME, createToken(), {
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

export function requireAuth(req, res, next) {
  if (isAuthed(req)) return next()
  res.status(401).json({ error: 'No autorizado' })
}
