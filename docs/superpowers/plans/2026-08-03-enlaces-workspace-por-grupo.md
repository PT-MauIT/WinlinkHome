# Enlaces de Workspace por grupo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un enlace de Workspace se asigne a uno o más grupos y cada usuario vea, en su Home, los enlaces globales más los de sus grupos en una sección aparte; además un dropdown personalizado legible acorde al diseño.

**Architecture:** Tabla de unión `link_groups` (enlace ↔ grupos). Un enlace sin grupos = global. El backend (`getState`) devuelve `links` globales + `groupLinks` agrupados; el frontend los pinta como secciones reutilizando el componente `Section`. Los `<select>` nativos se reemplazan por un componente `Select` con estilo glass.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind 4 (frontend), Express 5 + PostgreSQL (`pg`) (backend), Zustand (estado), `reicon-react` (iconos).

## Global Constraints

- **Migración additive-only.** Solo `CREATE TABLE IF NOT EXISTS`. Prohibido `ALTER`, `DROP`, `TRUNCATE` o modificar tablas existentes.
- **Neutral en comportamiento hasta que un admin actúe.** Los enlaces existentes quedan globales; nadie pierde visibilidad tras el deploy.
- **Sin re-seed.** No se toca `seedIfEmpty()`.
- **Sin framework de tests.** Verificación: `pnpm build` (typecheck TS + vite) para frontend, `node --check <archivo>` para backend JS, y verificación runtime por el dev server (Task 8).
- **Diseño glass.** El panel del dropdown usa `bg-[#14171e]/95` (mismo tono que `Modal`), texto `slate-100`, acento esmeralda.
- **Git.** Rama `feat/enlaces-workspace-por-grupo`. Push/PR a `origin` (PT-MauIT), nunca upstream. Cada commit termina con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Backend — escritura (schema + asignación de grupos)

**Files:**
- Modify: `server/db.js` (SCHEMA, `addLink`, `updateLink`; nuevas `setLinkGroups`, `getLinkGroupIds`)
- Modify: `server/index.js:182-192` (endpoints POST/PUT `/links`)

**Interfaces:**
- Produces:
  - `setLinkGroups(linkId: string, groupIds: string[]): Promise<void>`
  - `getLinkGroupIds(linkId: string): Promise<string[]>`
  - `addLink({ title, url, categoryId?, groupIds? }): Promise<{id,title,url,categoryId,groupIds,createdAt}>`
  - `updateLink(id, { title?, url?, categoryId?, groupIds? }): Promise<LinkRow & { groupIds: string[] }>`

- [ ] **Step 1: Agregar la tabla al `SCHEMA`**

En `server/db.js`, dentro de la constante `SCHEMA`, después del bloque `CREATE TABLE IF NOT EXISTS news (...)`, agregar:

```sql
  CREATE TABLE IF NOT EXISTS link_groups (
    link_id  TEXT NOT NULL REFERENCES links(id)  ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (link_id, group_id)
  );
  CREATE INDEX IF NOT EXISTS idx_link_groups_group ON link_groups(group_id);
```

- [ ] **Step 2: Agregar `setLinkGroups` y `getLinkGroupIds`**

En `server/db.js`, en la sección `// ---- groups ----` (después de `setUserGroups`), agregar:

```js
export async function setLinkGroups(linkId, groupIds) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM link_groups WHERE link_id = $1', [linkId])
    for (const gid of groupIds) {
      await client.query(
        'INSERT INTO link_groups (link_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [linkId, gid],
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

export async function getLinkGroupIds(linkId) {
  const { rows } = await pool.query('SELECT group_id FROM link_groups WHERE link_id = $1', [linkId])
  return rows.map((r) => r.group_id)
}
```

- [ ] **Step 3: Extender `addLink` para aceptar `groupIds`**

Reemplazar la función `addLink` existente por:

```js
export async function addLink({ title, url, categoryId = null, groupIds = [] }) {
  const id = uid()
  const createdAt = Date.now()
  const { rows } = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM links')
  await pool.query(
    'INSERT INTO links (id, title, url, category_id, position, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, title, url, categoryId, rows[0].p, createdAt],
  )
  await setLinkGroups(id, Array.isArray(groupIds) ? groupIds : [])
  return { id, title, url, categoryId, groupIds: Array.isArray(groupIds) ? groupIds : [], createdAt }
}
```

- [ ] **Step 4: Extender `updateLink` para sincronizar `groupIds`**

Reemplazar la función `updateLink` existente por:

```js
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
  if (Array.isArray(data.groupIds)) await setLinkGroups(id, data.groupIds)
  const groupIds = await getLinkGroupIds(id)
  return { ...toLink(upd[0]), groupIds }
}
```

- [ ] **Step 5: Pasar `groupIds` en los endpoints (`server/index.js`)**

Reemplazar el handler `POST /links` (líneas ~182-186) por:

```js
api.post('/links', requireAdmin, async (req, res) => {
  const { title, url, categoryId = null, groupIds = [] } = req.body ?? {}
  if (!url || !title) return res.status(400).json({ error: 'title y url son obligatorios' })
  res.status(201).json(await addLink({ title, url, categoryId, groupIds }))
})
```

El handler `PUT /links/:id` ya pasa `req.body` completo a `updateLink`, que ahora lee `data.groupIds` — **no requiere cambios**.

- [ ] **Step 6: Verificar sintaxis**

Run: `node --check server/db.js && node --check server/index.js`
Expected: sin salida (exit 0).

- [ ] **Step 7: Commit**

```bash
git add server/db.js server/index.js
git commit -m "feat(backend): asignacion de enlaces a grupos (tabla link_groups)"
```

---

### Task 2: Backend — lectura (getState con globales + por grupo)

**Files:**
- Modify: `server/db.js` (nuevas `getGlobalWorkspaceLinks`, `getGroupWorkspaceLinks`; reescribir `getState`; eliminar `getWorkspaceLinks` que queda sin uso)

**Interfaces:**
- Consumes: `toLink` (existente), `getUserGroups` (existente).
- Produces:
  - `getGlobalWorkspaceLinks(): Promise<LinkItem[]>` (cada uno con `groupIds: []`)
  - `getGroupWorkspaceLinks(user): Promise<{ group: {id,name,slug}, links: LinkItem[] }[]>`
  - `getState(user)` ahora devuelve `{ user, categories, links, groupLinks, favorites, background }`

- [ ] **Step 1: Agregar `getGlobalWorkspaceLinks` y `getGroupWorkspaceLinks`**

En `server/db.js`, en la sección `// ---- workspace links (admin) ----`, después de `getWorkspaceLinks`, agregar:

```js
export async function getGlobalWorkspaceLinks() {
  const { rows } = await pool.query(`
    SELECT l.* FROM links l
    WHERE NOT EXISTS (SELECT 1 FROM link_groups lg WHERE lg.link_id = l.id)
    ORDER BY l.position, l.created_at
  `)
  return rows.map((r) => ({ ...toLink(r), groupIds: [] }))
}

export async function getGroupWorkspaceLinks(user) {
  // Miembro: sus grupos. Admin: todos los grupos que tengan enlaces.
  const groups = user.role === 'admin'
    ? (await pool.query(`
        SELECT DISTINCT g.id, g.name, g.slug FROM groups g
        JOIN link_groups lg ON lg.group_id = g.id
        ORDER BY g.name
      `)).rows
    : (await pool.query(`
        SELECT g.id, g.name, g.slug FROM groups g
        JOIN user_groups ug ON ug.group_id = g.id
        WHERE ug.user_id = $1
        ORDER BY g.name
      `, [user.id])).rows

  const sections = []
  for (const g of groups) {
    const { rows } = await pool.query(`
      SELECT l.*,
        (SELECT COALESCE(array_agg(lg2.group_id), '{}')
           FROM link_groups lg2 WHERE lg2.link_id = l.id) AS group_ids
      FROM links l
      JOIN link_groups lg ON lg.link_id = l.id AND lg.group_id = $1
      ORDER BY l.position, l.created_at
    `, [g.id])
    if (rows.length > 0) {
      sections.push({
        group: g,
        links: rows.map((r) => ({ ...toLink(r), groupIds: r.group_ids })),
      })
    }
  }
  return sections
}
```

- [ ] **Step 2: Reescribir `getState`**

Reemplazar la función `getState` existente por:

```js
export async function getState(user) {
  const [categories, links, groupLinks, favorites, myGroups, background] = await Promise.all([
    getCategories(),
    getGlobalWorkspaceLinks(),
    getGroupWorkspaceLinks(user),
    listFavorites(user.id),
    getUserGroups(user.id),
    getBackground(),
  ])
  return {
    user: { ...user, groups: myGroups },
    categories,
    links,
    groupLinks,
    favorites,
    background,
  }
}
```

- [ ] **Step 3: Eliminar `getWorkspaceLinks` (queda sin uso)**

Borrar la función `getWorkspaceLinks` (ya no la llama nadie; `getState` ahora usa `getGlobalWorkspaceLinks`). Confirmar que no se importa en otro archivo:

Run: `grep -rn "getWorkspaceLinks" server/`
Expected: sin resultados tras el borrado.

- [ ] **Step 4: Verificar sintaxis**

Run: `node --check server/db.js`
Expected: sin salida (exit 0).

- [ ] **Step 5: Commit**

```bash
git add server/db.js
git commit -m "feat(backend): getState devuelve enlaces globales + por grupo"
```

---

### Task 3: Frontend — tipos + cliente API

**Files:**
- Modify: `src/types.ts` (`LinkItem.groupIds`, nuevo `GroupLinks`)
- Modify: `src/lib/api.ts` (`LinkInput.groupIds`, `StatePayload.groupLinks`, import de `GroupLinks`)

**Interfaces:**
- Produces:
  - `LinkItem` con `groupIds?: string[]`
  - `interface GroupLinks { group: Group; links: LinkItem[] }`
  - `StatePayload.groupLinks: GroupLinks[]`

- [ ] **Step 1: Extender tipos (`src/types.ts`)**

En `LinkItem`, agregar el campo `groupIds`:

```ts
export interface LinkItem {
  id: string
  title: string
  url: string
  categoryId: string | null
  createdAt: number
  groupIds?: string[]
}
```

Y agregar, después de la interfaz `Group`:

```ts
export interface GroupLinks {
  group: Group
  links: LinkItem[]
}
```

- [ ] **Step 2: Extender el cliente API (`src/lib/api.ts`)**

Agregar `GroupLinks` al import de tipos desde `../types`. Cambiar el type `LinkInput` y la interfaz `StatePayload`:

```ts
type LinkInput = { title: string; url: string; categoryId: string | null; groupIds?: string[] }

interface StatePayload {
  user: User
  categories: Category[]
  links: LinkItem[]
  groupLinks: GroupLinks[]
  favorites: LinkItem[]
  background: Background
}
```

(Los métodos `addLink`/`updateLink` ya serializan `data` completo, así que `groupIds` viaja automáticamente cuando se incluye.)

- [ ] **Step 3: Verificar typecheck + build**

Run: `pnpm build`
Expected: PASS (sin errores de TypeScript).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/lib/api.ts
git commit -m "feat(types): groupIds en LinkItem y groupLinks en el estado"
```

---

### Task 4: Frontend — store (`useStore`)

**Files:**
- Modify: `src/store/useStore.ts` (estado `groupLinks`; `load`; recarga en mutaciones de Workspace)

**Interfaces:**
- Consumes: `GroupLinks` (Task 3), `api.getState()` con `groupLinks` (Task 2/3).
- Produces: `useStore` expone `groupLinks: GroupLinks[]`.

- [ ] **Step 1: Agregar `groupLinks` al estado**

En `src/store/useStore.ts`, importar el tipo:

```ts
import type { Background, Category, GroupLinks, LinkItem, PaletteKey } from '../types'
```

En la interfaz `Store`, después de `links: LinkItem[]`, agregar:

```ts
  groupLinks: GroupLinks[]
```

En el estado inicial del `create`, después de `links: [],`, agregar:

```ts
  groupLinks: [],
```

- [ ] **Step 2: Poblar `groupLinks` en `load`**

En la acción `load`, dentro del `set({ ... })`, agregar la línea:

```ts
      groupLinks: state.groupLinks ?? [],
```

- [ ] **Step 3: Recargar estado tras mutaciones de Workspace**

Reemplazar las tres acciones de enlaces de Workspace (`addLink`, `updateLink`, `removeLink`) por versiones que recargan el estado (un enlace puede cambiar de sección al asignarle grupos):

```ts
  // ---- workspace links (admin) ----
  addLink: async (data) => {
    try {
      await api.addLink(data)
      await get().load()
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },
  updateLink: async (id, data) => {
    try {
      await api.updateLink(id, data)
      await get().load()
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },
  removeLink: async (id) => {
    try {
      await api.removeLink(id)
      await get().load()
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },
```

(Los favoritos quedan igual — no cambian de sección.)

- [ ] **Step 4: Verificar typecheck + build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts
git commit -m "feat(store): groupLinks en el estado y recarga en mutaciones de workspace"
```

---

### Task 5: Frontend — componente `Select` y su aplicación

**Files:**
- Create: `src/components/ui/Select.tsx`
- Modify: `src/components/modals/LinkFormModal.tsx` (categoría usa `Select`)
- Modify: `src/components/news/NewsFormModal.tsx` (grupo usa `Select`)

**Interfaces:**
- Produces:
  - `interface SelectOption { value: string; label: string }`
  - `Select({ value, onChange, options, placeholder?, disabled?, className? })`

- [ ] **Step 1: Crear el componente `Select`**

Crear `src/components/ui/Select.tsx` con:

```tsx
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'reicon-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

const control =
  'flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-white/25 disabled:opacity-40'

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  disabled,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    if (open) {
      const i = options.findIndex((o) => o.value === value)
      setActive(i < 0 ? 0 : i)
    }
  }, [open, value, options])

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        e.stopPropagation() // no cerrar el Modal, solo el dropdown
        setOpen(false)
      }
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open && options[active]) choose(options[active].value)
      else setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setActive((a) => Math.min(a + 1, options.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} onKeyDown={onKeyDown} className={control}>
        <span className={selected ? 'text-slate-100' : 'text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#14171e]/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-sm"
        >
          {options.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin opciones</li>}
          {options.map((o, i) => {
            const isSel = o.value === value
            const isActive = i === active
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                    isSel
                      ? 'bg-emerald-400/15 text-emerald-200'
                      : isActive
                        ? 'bg-white/[0.06] text-slate-100'
                        : 'text-slate-200'
                  }`}
                >
                  {o.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Usar `Select` para la categoría en `LinkFormModal`**

En `src/components/modals/LinkFormModal.tsx`, agregar el import:

```tsx
import { Select } from '../ui/Select'
```

Reemplazar el bloque `<label>…<select>…</select></label>` de la categoría por:

```tsx
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Categoría</span>
          <Select
            value={categoryId ?? ''}
            onChange={(v) => setCategoryId(v || null)}
            placeholder="Sin categoría"
            options={[
              { value: '', label: 'Sin categoría' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </label>
```

- [ ] **Step 3: Usar `Select` para el grupo en `NewsFormModal`**

En `src/components/news/NewsFormModal.tsx`, agregar el import:

```tsx
import { Select } from '../ui/Select'
```

Reemplazar el `<select>…</select>` del grupo por:

```tsx
            <Select
              value={groupId ?? ''}
              onChange={(v) => setGroupId(v || null)}
              placeholder="Selecciona un grupo…"
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
            />
```

- [ ] **Step 4: Verificar typecheck + build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Select.tsx src/components/modals/LinkFormModal.tsx src/components/news/NewsFormModal.tsx
git commit -m "feat(ui): dropdown Select personalizado, legible y acorde al diseno"
```

---

### Task 6: Frontend — asignar grupos al crear/editar enlace (admin)

**Files:**
- Modify: `src/components/modals/LinkFormModal.tsx` (multi-select de grupos con chips)

**Interfaces:**
- Consumes: `useGroups` (`groups`, `loaded`, `load`), `useAuth` (`user.role`), `LinkItem.groupIds` (Task 3), `updateLink`/`addLink` que aceptan `groupIds` (Task 4).

- [ ] **Step 1: Cargar grupos y estado local en `LinkFormModal`**

En `src/components/modals/LinkFormModal.tsx`, agregar imports:

```tsx
import { useGroups } from '../../store/useGroups'
import { useAuth } from '../../store/useAuth'
```

Dentro del componente, agregar los hooks y el estado:

```tsx
  const groups = useGroups((s) => s.groups)
  const groupsLoaded = useGroups((s) => s.loaded)
  const loadGroups = useGroups((s) => s.load)
  const isAdmin = useAuth((s) => s.user?.role === 'admin')
  const [groupIds, setGroupIds] = useState<string[]>([])
```

Agregar un efecto que carga grupos cuando el modal abre para un admin en modo workspace:

```tsx
  useEffect(() => {
    if (linkModal.open && isWorkspace && isAdmin && !groupsLoaded) void loadGroups()
  }, [linkModal.open, isWorkspace, isAdmin, groupsLoaded, loadGroups])
```

- [ ] **Step 2: Precargar `groupIds` al abrir/editar**

Dentro del `useEffect` existente que resetea el formulario (el que depende de `[linkModal.open, linkModal.editId, linkModal.prefillUrl]`), en la rama `if (editing) { … }` agregar:

```tsx
      setGroupIds(editing.groupIds ?? [])
```

y en la rama `else { … }` agregar:

```tsx
      setGroupIds([])
```

- [ ] **Step 3: Incluir `groupIds` en el submit**

En la función `submit`, cambiar la construcción de `payload` para incluir `groupIds` solo cuando es workspace:

```tsx
    const payload = {
      title: title.trim() || deriveTitle(url),
      url: normalizeUrl(url),
      categoryId,
      ...(isWorkspace ? { groupIds } : {}),
    }
```

- [ ] **Step 4: Renderizar los chips de grupos (solo admin + workspace)**

En el JSX, después del `<label>` de la categoría (dentro del `<div className="space-y-3">`), agregar:

```tsx
        {isWorkspace && isAdmin && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Grupos</span>
            <div className="flex flex-wrap gap-1.5">
              {groups.length === 0 && (
                <span className="text-xs text-slate-500">
                  No hay grupos. Créalos en “Grupos y usuarios”.
                </span>
              )}
              {groups.map((g) => {
                const on = groupIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setGroupIds((cur) => (on ? cur.filter((x) => x !== g.id) : [...cur, g.id]))
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      on
                        ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    {g.name}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Sin grupos = visible para todos.</p>
          </div>
        )}
```

- [ ] **Step 5: Verificar typecheck + build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/LinkFormModal.tsx
git commit -m "feat(admin): asignar enlaces de workspace a uno o mas grupos"
```

---

### Task 7: Frontend — sección "De mis grupos" en el tablero

**Files:**
- Modify: `src/components/LinkGrid.tsx` (renderizar secciones por grupo)

**Interfaces:**
- Consumes: `useStore.groupLinks` (Task 4), componente `Section` (existente en el mismo archivo), `useAuth` (`isAdmin`, ya importado).

- [ ] **Step 1: Leer `groupLinks` y renderizar las secciones por grupo**

En `src/components/LinkGrid.tsx`, dentro de `LinkGrid`, agregar la lectura del estado (junto a los otros `useStore`):

```tsx
  const groupLinks = useStore((s) => s.groupLinks)
```

Luego, en el `return`, entre la sección `{showWorkspace && (…Workspace…)}` y `{showFavorites && (…Favoritos…)}`, insertar el bloque de grupos:

```tsx
      {showWorkspace &&
        groupLinks.some((gl) => filterList(gl.links).length > 0) && (
          <div className="space-y-9">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isAdmin ? 'Enlaces por grupo' : 'De mis grupos'}
            </p>
            {groupLinks.map((gl) => {
              const items = filterList(gl.links)
              if (items.length === 0) return null
              return (
                <Section
                  key={gl.group.id}
                  title={gl.group.name}
                  subtitle="Herramientas del grupo"
                  items={items}
                  kind="workspace"
                  categoryById={categoryById}
                  canAdd={false}
                  onAdd={() => {}}
                  emptyLabel=""
                />
              )
            })}
          </div>
        )}
```

(`kind="workspace"` hace que las tarjetas muestren los controles de edición al admin, igual que el Workspace global. `canAdd={false}`: los enlaces se crean/asignan desde el modal de Workspace.)

- [ ] **Step 2: Verificar typecheck + build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/LinkGrid.tsx
git commit -m "feat(board): seccion De mis grupos con enlaces por grupo"
```

---

### Task 8: Verificación end-to-end (runtime)

**Files:** ninguno (verificación).

**Prerequisitos:** Postgres corriendo (`docker compose up -d postgres`) y `.env` con `DATABASE_URL`, `SESSION_SECRET`, `APP_PASSWORD` (login por contraseña como admin bootstrap). Ver `SETUP.md`.

- [ ] **Step 1: Levantar la app**

Run: `pnpm dev`
Expected: Vite en `http://localhost:5173` y API en `:3001` sin errores en consola.

- [ ] **Step 2: Verificar migración sin pérdida de datos**

Con la BD ya existente, confirmar que la tabla nueva se creó y que los enlaces previos siguen visibles como globales:

Run: `docker compose exec postgres psql -U winlink -d winlinkhome -c "\\dt link_groups" -c "SELECT count(*) FROM links;"`
Expected: la tabla `link_groups` existe; el conteo de `links` es el mismo que antes del deploy.

- [ ] **Step 3: Verificar el flujo admin (asignar a grupo)**

En el navegador (login como admin): abrir Grupos y usuarios → confirmar que hay ≥1 grupo. Abrir "Agregar" en Workspace → crear un enlace → seleccionar un grupo en los chips → Agregar.
Expected: el enlace desaparece de la sección Workspace (global) y aparece bajo la sección del grupo en "Enlaces por grupo".

- [ ] **Step 4: Verificar el dropdown personalizado**

Abrir el modal de un enlace y desplegar el `Select` de Categoría; abrir "Publicar noticia" → "Por grupo" → desplegar el `Select` de grupo.
Expected: la lista abre con fondo oscuro glass, texto legible, la opción seleccionada en esmeralda; cierra con clic fuera y con `Escape` (sin cerrar el modal).

- [ ] **Step 5: Verificar visibilidad por usuario**

Como miembro de ese grupo: el enlace aparece en "De mis grupos". Como miembro de otro grupo o sin grupos: el enlace no aparece; sí ve los globales.
Expected: coincide con la regla de visibilidad.

- [ ] **Step 6: Confirmar build de producción**

Run: `pnpm build`
Expected: PASS (typecheck + vite build sin errores).

---

## Notas de despliegue

- **Antes del deploy a producción:** `pg_dump` de respaldo de la BD (estándar; el feature no borra nada pero cubre cualquier imprevisto de ops).
- La migración se aplica sola al arrancar (`initSchema` con `CREATE TABLE IF NOT EXISTS`). No hay script de migración manual.
- PR contra `origin` (PT-MauIT), base `master`.
