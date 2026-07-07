import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DB_PATH = process.env.DB_PATH || './data/linkboard.db'
mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    color    TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS links (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at  INTEGER NOT NULL
  );
`)

const uid = () => randomUUID()

// ---- settings -------------------------------------------------------------

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : fallback
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, String(value))
}

// ---- read -----------------------------------------------------------------

const toLink = (r) => ({
  id: r.id,
  title: r.title,
  url: r.url,
  categoryId: r.category_id,
  createdAt: r.created_at,
})

const DEFAULT_BACKGROUND = { source: 'default', url: null, credit: null }

export function getBackground() {
  const raw = getSetting('background')
  if (!raw) return DEFAULT_BACKGROUND
  try {
    return { ...DEFAULT_BACKGROUND, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_BACKGROUND
  }
}

export function setBackground({ source, url = null, credit = null }) {
  const value = { source, url, credit }
  setSetting('background', JSON.stringify(value))
  return value
}

export function getState() {
  const categories = db
    .prepare('SELECT id, name, color FROM categories ORDER BY position, rowid')
    .all()
  const links = db
    .prepare('SELECT * FROM links ORDER BY created_at')
    .all()
    .map(toLink)
  return {
    userName: getSetting('userName', 'amigo'),
    categories,
    links,
    background: getBackground(),
  }
}

// ---- links ----------------------------------------------------------------

export function addLink({ title, url, categoryId = null }) {
  const link = { id: uid(), title, url, categoryId, createdAt: Date.now() }
  db.prepare(
    'INSERT INTO links (id, title, url, category_id, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(link.id, link.title, link.url, link.categoryId, link.createdAt)
  return link
}

export function updateLink(id, data) {
  const existing = db.prepare('SELECT * FROM links WHERE id = ?').get(id)
  if (!existing) return null
  const merged = {
    title: data.title ?? existing.title,
    url: data.url ?? existing.url,
    categoryId: data.categoryId === undefined ? existing.category_id : data.categoryId,
  }
  db.prepare('UPDATE links SET title = ?, url = ?, category_id = ? WHERE id = ?').run(
    merged.title,
    merged.url,
    merged.categoryId,
    id,
  )
  return toLink(db.prepare('SELECT * FROM links WHERE id = ?').get(id))
}

export function removeLink(id) {
  db.prepare('DELETE FROM links WHERE id = ?').run(id)
}

// ---- categories -----------------------------------------------------------

export function addCategory({ name, color }) {
  const category = { id: uid(), name, color }
  const nextPos =
    db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM categories').get().p
  db.prepare(
    'INSERT INTO categories (id, name, color, position) VALUES (?, ?, ?, ?)',
  ).run(category.id, category.name, category.color, nextPos)
  return category
}

export function updateCategory(id, data) {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  if (!existing) return null
  const name = data.name ?? existing.name
  const color = data.color ?? existing.color
  db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(name, color, id)
  return { id, name, color }
}

export function removeCategory(id) {
  // links keep existing; their category_id becomes NULL via ON DELETE SET NULL
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}

// ---- one-time seed --------------------------------------------------------

export function seedIfEmpty() {
  if (getSetting('initialized') === '1') return

  const now = Date.now()
  const cats = [
    { id: 'trabajo', name: 'Trabajo', color: 'blue' },
    { id: 'estudio', name: 'Estudio', color: 'purple' },
    { id: 'ocio', name: 'Ocio', color: 'orange' },
    { id: 'herramientas', name: 'Herramientas', color: 'green' },
  ]
  const links = [
    { id: 'gmail', title: 'Gmail', url: 'https://mail.google.com', category_id: 'trabajo' },
    { id: 'github', title: 'GitHub', url: 'https://github.com', category_id: 'trabajo' },
    { id: 'notion', title: 'Notion', url: 'https://notion.so', category_id: 'estudio' },
    { id: 'youtube', title: 'YouTube', url: 'https://youtube.com', category_id: 'ocio' },
    { id: 'figma', title: 'Figma', url: 'https://figma.com', category_id: 'herramientas' },
    { id: 'spotify', title: 'Spotify', url: 'https://open.spotify.com', category_id: 'ocio' },
  ]

  const insertCat = db.prepare(
    'INSERT INTO categories (id, name, color, position) VALUES (?, ?, ?, ?)',
  )
  const insertLink = db.prepare(
    'INSERT INTO links (id, title, url, category_id, created_at) VALUES (?, ?, ?, ?, ?)',
  )

  cats.forEach((c, i) => insertCat.run(c.id, c.name, c.color, i))
  links.forEach((l, i) => insertLink.run(l.id, l.title, l.url, l.category_id, now + i))

  setSetting('userName', 'MIT')
  setSetting('initialized', '1')
}

export default db
