import pg from 'pg'
import { randomUUID } from 'node:crypto'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  console.warn(
    '⚠  DATABASE_URL no definida — usando postgres://winlink:winlink@localhost:5432/winlinkhome. ' +
      'Levanta la BD con `docker compose up -d postgres`.',
  )
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://winlink:winlink@localhost:5432/winlinkhome',
})

const uid = () => randomUUID()

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'grupo'

// ---- schema ---------------------------------------------------------------

const SCHEMA = `
  CREATE EXTENSION IF NOT EXISTS citext;

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

  CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY,
    ms_oid     TEXT UNIQUE,
    email      CITEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
    created_at BIGINT NOT NULL,
    last_login BIGINT
  );

  -- Workspace: enlaces base gestionados por el admin (compartidos, no removibles por usuarios)
  CREATE TABLE IF NOT EXISTS links (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  BIGINT NOT NULL
  );

  -- Favoritos: enlaces propios de cada usuario (persistentes)
  CREATE TABLE IF NOT EXISTS user_links (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at  BIGINT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_user_links_user ON user_links(user_id);

  CREATE TABLE IF NOT EXISTS groups (
    id         UUID PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT UNIQUE NOT NULL,
    created_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_groups (
    user_id  UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
  );

  CREATE TABLE IF NOT EXISTS news (
    id         UUID PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    audience   TEXT NOT NULL DEFAULT 'general' CHECK (audience IN ('general','group')),
    group_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
    author_id  UUID REFERENCES users(id)  ON DELETE SET NULL,
    created_at BIGINT NOT NULL
  );
`

export async function initSchema() {
  await pool.query(SCHEMA)
}

// ---- settings -------------------------------------------------------------

export async function getSetting(key, fallback = null) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key])
  return rows.length ? rows[0].value : fallback
}

export async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, String(value)],
  )
}

// ---- background ------------------------------------------------------------

const DEFAULT_BACKGROUND = { source: 'default', url: null, credit: null }

export async function getBackground() {
  const raw = await getSetting('background')
  if (!raw) return DEFAULT_BACKGROUND
  try {
    return { ...DEFAULT_BACKGROUND, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_BACKGROUND
  }
}

export async function setBackground({ source, url = null, credit = null }) {
  const value = { source, url, credit }
  await setSetting('background', JSON.stringify(value))
  return value
}

// ---- users ----------------------------------------------------------------

const toUser = (r) =>
  r ? { id: r.id, email: r.email, name: r.name, role: r.role } : null

export async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return toUser(rows[0])
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  return toUser(rows[0])
}

/** Upsert a user coming from a Microsoft SSO login (matched by oid, then email). */
export async function upsertSsoUser({ oid, email, name, isAdmin }) {
  const now = Date.now()

  const byOid = await pool.query('SELECT * FROM users WHERE ms_oid = $1', [oid])
  if (byOid.rows[0]) {
    const u = byOid.rows[0]
    const { rows } = await pool.query(
      'UPDATE users SET email = $2, name = $3, role = $4, last_login = $5 WHERE id = $1 RETURNING *',
      [u.id, email, u.name || name, isAdmin ? 'admin' : u.role, now],
    )
    return toUser(rows[0])
  }

  const byEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  if (byEmail.rows[0]) {
    const u = byEmail.rows[0]
    const { rows } = await pool.query(
      'UPDATE users SET ms_oid = $2, name = COALESCE(name, $3), role = $4, last_login = $5 WHERE id = $1 RETURNING *',
      [u.id, oid, name, isAdmin ? 'admin' : u.role, now],
    )
    return toUser(rows[0])
  }

  const { rows } = await pool.query(
    `INSERT INTO users (id, ms_oid, email, name, role, created_at, last_login)
     VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
    [uid(), oid, email, name, isAdmin ? 'admin' : 'member', now],
  )
  return toUser(rows[0])
}

/** Ensure a bootstrap admin exists for the password fallback login. */
export async function ensureBootstrapAdmin({ email, name = 'Admin' }) {
  const now = Date.now()
  const found = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (found.rows[0]) {
    const { rows } = await pool.query(
      "UPDATE users SET role = 'admin', last_login = $2 WHERE id = $1 RETURNING *",
      [found.rows[0].id, now],
    )
    return toUser(rows[0])
  }
  const { rows } = await pool.query(
    `INSERT INTO users (id, ms_oid, email, name, role, created_at, last_login)
     VALUES ($1, NULL, $2, $3, 'admin', $4, $4) RETURNING *`,
    [uid(), email, name, now],
  )
  return toUser(rows[0])
}

export async function setUserName(userId, name) {
  const { rows } = await pool.query(
    'UPDATE users SET name = $2 WHERE id = $1 RETURNING *',
    [userId, name],
  )
  return toUser(rows[0])
}

export async function listUsers() {
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.name, u.role,
      COALESCE(
        json_agg(json_build_object('id', g.id, 'name', g.name, 'slug', g.slug))
          FILTER (WHERE g.id IS NOT NULL),
        '[]'
      ) AS groups
    FROM users u
    LEFT JOIN user_groups ug ON ug.user_id = u.id
    LEFT JOIN groups g ON g.id = ug.group_id
    GROUP BY u.id
    ORDER BY u.name
  `)
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    groups: r.groups,
  }))
}

// ---- groups ---------------------------------------------------------------

export async function listGroups() {
  const { rows } = await pool.query('SELECT id, name, slug FROM groups ORDER BY name')
  return rows
}

export async function addGroup({ name }) {
  const id = uid()
  const slug = `${slugify(name)}-${id.slice(0, 4)}`
  const { rows } = await pool.query(
    'INSERT INTO groups (id, name, slug, created_at) VALUES ($1, $2, $3, $4) RETURNING id, name, slug',
    [id, name, slug, Date.now()],
  )
  return rows[0]
}

export async function removeGroup(id) {
  await pool.query('DELETE FROM groups WHERE id = $1', [id])
}

export async function getUserGroups(userId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.slug
     FROM groups g JOIN user_groups ug ON ug.group_id = g.id
     WHERE ug.user_id = $1 ORDER BY g.name`,
    [userId],
  )
  return rows
}

export async function setUserGroups(userId, groupIds) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM user_groups WHERE user_id = $1', [userId])
    for (const gid of groupIds) {
      await client.query(
        'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, gid],
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ---- categories -----------------------------------------------------------

export async function getCategories() {
  const { rows } = await pool.query(
    'SELECT id, name, color FROM categories ORDER BY position, id',
  )
  return rows
}

export async function addCategory({ name, color }) {
  const id = uid()
  const { rows } = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM categories')
  await pool.query(
    'INSERT INTO categories (id, name, color, position) VALUES ($1, $2, $3, $4)',
    [id, name, color, rows[0].p],
  )
  return { id, name, color }
}

export async function updateCategory(id, data) {
  const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id])
  if (!rows[0]) return null
  const name = data.name ?? rows[0].name
  const color = data.color ?? rows[0].color
  await pool.query('UPDATE categories SET name = $2, color = $3 WHERE id = $1', [id, name, color])
  return { id, name, color }
}

export async function removeCategory(id) {
  await pool.query('DELETE FROM categories WHERE id = $1', [id])
}

// ---- workspace links (admin) ----------------------------------------------

const toLink = (r) => ({
  id: r.id,
  title: r.title,
  url: r.url,
  categoryId: r.category_id,
  createdAt: Number(r.created_at),
})

export async function getWorkspaceLinks() {
  const { rows } = await pool.query('SELECT * FROM links ORDER BY position, created_at')
  return rows.map(toLink)
}

export async function addLink({ title, url, categoryId = null }) {
  const id = uid()
  const createdAt = Date.now()
  const { rows } = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM links')
  await pool.query(
    'INSERT INTO links (id, title, url, category_id, position, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, title, url, categoryId, rows[0].p, createdAt],
  )
  return { id, title, url, categoryId, createdAt }
}

export async function updateLink(id, data) {
  const { rows } = await pool.query('SELECT * FROM links WHERE id = $1', [id])
  if (!rows[0]) return null
  const ex = rows[0]
  const title = data.title ?? ex.title
  const url = data.url ?? ex.url
  const categoryId = data.categoryId === undefined ? ex.category_id : data.categoryId
  const { rows: upd } = await pool.query(
    'UPDATE links SET title = $2, url = $3, category_id = $4 WHERE id = $1 RETURNING *',
    [id, title, url, categoryId],
  )
  return toLink(upd[0])
}

export async function removeLink(id) {
  await pool.query('DELETE FROM links WHERE id = $1', [id])
}

// ---- favorites (user_links) -----------------------------------------------

const toFav = (r) => ({
  id: r.id,
  title: r.title,
  url: r.url,
  categoryId: r.category_id,
  createdAt: Number(r.created_at),
})

export async function listFavorites(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM user_links WHERE user_id = $1 ORDER BY created_at',
    [userId],
  )
  return rows.map(toFav)
}

export async function addFavorite(userId, { title, url, categoryId = null }) {
  const id = uid()
  const createdAt = Date.now()
  await pool.query(
    'INSERT INTO user_links (id, user_id, title, url, category_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, userId, title, url, categoryId, createdAt],
  )
  return { id, title, url, categoryId, createdAt }
}

export async function updateFavorite(userId, id, data) {
  const { rows } = await pool.query(
    'SELECT * FROM user_links WHERE id = $1 AND user_id = $2',
    [id, userId],
  )
  if (!rows[0]) return null
  const ex = rows[0]
  const title = data.title ?? ex.title
  const url = data.url ?? ex.url
  const categoryId = data.categoryId === undefined ? ex.category_id : data.categoryId
  const { rows: upd } = await pool.query(
    'UPDATE user_links SET title = $3, url = $4, category_id = $5 WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId, title, url, categoryId],
  )
  return toFav(upd[0])
}

export async function removeFavorite(userId, id) {
  await pool.query('DELETE FROM user_links WHERE id = $1 AND user_id = $2', [id, userId])
}

// ---- news -----------------------------------------------------------------

const toNews = (r) => ({
  id: r.id,
  title: r.title,
  body: r.body,
  audience: r.audience,
  groupId: r.group_id,
  groupName: r.group_name ?? null,
  authorName: r.author_name ?? null,
  createdAt: Number(r.created_at),
})

const NEWS_SELECT = `
  SELECT n.*, g.name AS group_name, u.name AS author_name
  FROM news n
  LEFT JOIN groups g ON g.id = n.group_id
  LEFT JOIN users  u ON u.id = n.author_id
`

export async function listAllNews() {
  const { rows } = await pool.query(`${NEWS_SELECT} ORDER BY n.created_at DESC`)
  return rows.map(toNews)
}

export async function listNewsForUser(userId) {
  const { rows } = await pool.query(
    `${NEWS_SELECT}
     WHERE n.audience = 'general'
        OR n.group_id IN (SELECT group_id FROM user_groups WHERE user_id = $1)
     ORDER BY n.created_at DESC`,
    [userId],
  )
  return rows.map(toNews)
}

export async function addNews({ title, body, audience, groupId = null, authorId }) {
  const id = uid()
  const createdAt = Date.now()
  const gid = audience === 'group' ? groupId : null
  await pool.query(
    'INSERT INTO news (id, title, body, audience, group_id, author_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, title, body, audience, gid, authorId, createdAt],
  )
  const { rows } = await pool.query(`${NEWS_SELECT} WHERE n.id = $1`, [id])
  return toNews(rows[0])
}

export async function removeNews(id) {
  await pool.query('DELETE FROM news WHERE id = $1', [id])
}

// ---- aggregate state ------------------------------------------------------

export async function getState(user) {
  const [categories, links, favorites, myGroups, background] = await Promise.all([
    getCategories(),
    getWorkspaceLinks(),
    listFavorites(user.id),
    getUserGroups(user.id),
    getBackground(),
  ])
  return {
    user: { ...user, groups: myGroups },
    categories,
    links,
    favorites,
    background,
  }
}

// ---- one-time seed --------------------------------------------------------

export async function seedIfEmpty() {
  if ((await getSetting('initialized')) === '1') return

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

  for (const [i, c] of cats.entries()) {
    await pool.query(
      'INSERT INTO categories (id, name, color, position) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [c.id, c.name, c.color, i],
    )
  }
  for (const [i, l] of links.entries()) {
    await pool.query(
      'INSERT INTO links (id, title, url, category_id, position, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
      [l.id, l.title, l.url, l.category_id, i, now + i],
    )
  }

  await setSetting('initialized', '1')
}

export default pool
