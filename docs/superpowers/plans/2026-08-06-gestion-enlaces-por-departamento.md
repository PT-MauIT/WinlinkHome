# Gestión de enlaces por departamento + iconos automáticos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un panel de admin con pestañas por departamento para gestionar los enlaces de Workspace, dejar el tablero solo-lectura, y cargar los iconos automáticamente con mayor resolución y cadena de fallback.

**Architecture:** Frontend-only. El panel reusa datos existentes (`useGroups.groups` para las pestañas, `useStore.links`+`groupLinks` para el contenido, `LinkFormModal` para alta/edición). Los iconos se resuelven con `faviconSources()` (lista ordenada) consumida por un componente `Favicon` compartido.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind 4, Zustand, `reicon-react`.

## Global Constraints

- **Frontend-only.** Sin cambios de backend ni de base de datos. Sin migración.
- **Sin framework de tests** (por diseño, aprobado en el spec). Verificación: `pnpm build` (tsc + vite) debe pasar (exit 0). Verificación runtime al final por el dev server.
- **Diseño glass.** Reusar `ui/Modal`, tokens existentes (`bg-[#14171e]/95`, `slate-100`, acento esmeralda `emerald-400/15` / `emerald-200`).
- **Iconos automáticos** (sin campo manual). Orden de fuentes: DuckDuckGo → Google `sz=128` → iniciales.
- **Git.** Rama `feat/gestion-enlaces-por-departamento`. PR/merge a `origin` (PT-MauIT), base `master`, nunca upstream. Cada commit termina con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Plumbing UI — `presetGroupIds` + `workspaceLinksOpen`

**Files:**
- Modify: `src/store/useUI.ts`
- Modify: `src/components/modals/LinkFormModal.tsx:65-71` (rama "agregar" del efecto de reset)

**Interfaces:**
- Produces:
  - `linkModal.presetGroupIds: string[]`
  - `openAddLink(kind: LinkKind, prefillUrl?: string, presetGroupIds?: string[])`
  - `workspaceLinksOpen: boolean`, `openWorkspaceLinks()`, `closeWorkspaceLinks()`

- [ ] **Step 1: Extender `useUI` (`src/store/useUI.ts`)**

Reemplazar la interfaz `LinkModalState` y agregar el estado del panel. Cambios exactos:

En `interface LinkModalState`, agregar el campo:
```ts
interface LinkModalState {
  open: boolean
  editId: string | null
  prefillUrl: string
  kind: LinkKind
  presetGroupIds: string[]
}
```

En `interface UIStore`, agregar `workspaceLinksOpen` y cambiar la firma de `openAddLink`, y agregar las dos acciones del panel:
```ts
  workspaceLinksOpen: boolean

  openAddLink: (kind: LinkKind, prefillUrl?: string, presetGroupIds?: string[]) => void
```
y junto a `openGroupsPanel`/`closeGroupsPanel`:
```ts
  openWorkspaceLinks: () => void
  closeWorkspaceLinks: () => void
```

En el `create`, actualizar el estado inicial y las acciones:
```ts
  linkModal: { open: false, editId: null, prefillUrl: '', kind: 'favorite', presetGroupIds: [] },
  ...
  workspaceLinksOpen: false,

  openAddLink: (kind, prefillUrl = '', presetGroupIds = []) =>
    set({ linkModal: { open: true, editId: null, prefillUrl, kind, presetGroupIds } }),
  openEditLink: (kind, id) =>
    set({ linkModal: { open: true, editId: id, prefillUrl: '', kind, presetGroupIds: [] } }),
  closeLinkModal: () =>
    set({ linkModal: { open: false, editId: null, prefillUrl: '', kind: 'favorite', presetGroupIds: [] } }),
```
y agregar (junto a las de groups panel):
```ts
  openWorkspaceLinks: () => set({ workspaceLinksOpen: true }),
  closeWorkspaceLinks: () => set({ workspaceLinksOpen: false }),
```

- [ ] **Step 2: Precargar `presetGroupIds` al agregar (`LinkFormModal.tsx`)**

En el efecto de reset, en la rama `else` (agregar), reemplazar la línea
`setGroupIds([])` por:
```ts
      setGroupIds(linkModal.presetGroupIds ?? [])
```

- [ ] **Step 3: Verificar build**

Run: `pnpm build`
Expected: PASS (exit 0, sin errores TS).

- [ ] **Step 4: Commit**

```bash
git add src/store/useUI.ts src/components/modals/LinkFormModal.tsx
git commit -m "feat(ui): presetGroupIds al agregar enlace y estado del panel de gestion"
```

---

### Task 2: Iconos automáticos — `faviconSources` + componente `Favicon`

**Files:**
- Modify: `src/lib/url.ts` (reemplazar `faviconUrl` por `faviconSources`)
- Create: `src/components/ui/Favicon.tsx`
- Modify: `src/components/LinkCard.tsx` (usar `<Favicon>` en el badge)
- Modify: `src/components/modals/LinkFormModal.tsx` (preview usa `faviconSources`)

**Interfaces:**
- Consumes: `getDomain`, `initials` (existentes en `lib/url.ts`).
- Produces:
  - `faviconSources(url: string): string[]`
  - `Favicon({ url, title, imgClassName? })` en `src/components/ui/Favicon.tsx`

- [ ] **Step 1: Reemplazar `faviconUrl` por `faviconSources` (`src/lib/url.ts`)**

Borrar la función `faviconUrl` y agregar en su lugar:
```ts
/** Fuentes de favicon en orden: se prueba cada una hasta que cargue; si todas
 *  fallan, el consumidor cae a iniciales.
 *  1) DuckDuckGo — iconos limpios, devuelve 404 real cuando no existe (dispara fallback).
 *  2) Google s2 en alta resolución — nítido a tamaños chicos, último recurso con imagen. */
export function faviconSources(url: string): string[] {
  const domain = getDomain(url)
  return [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ]
}
```

- [ ] **Step 2: Crear el componente `Favicon` (`src/components/ui/Favicon.tsx`)**

```tsx
import { useState } from 'react'
import { faviconSources, initials } from '../../lib/url'

interface FaviconProps {
  url: string
  title: string
  imgClassName?: string
}

/** Favicon del sitio con cadena de fallback entre fuentes; termina en iniciales. */
export function Favicon({ url, title, imgClassName = 'h-6 w-6' }: FaviconProps) {
  const sources = faviconSources(url)
  const [idx, setIdx] = useState(0)
  if (idx >= sources.length) return <>{initials(title)}</>
  return (
    <img
      key={sources[idx]}
      src={sources[idx]}
      alt=""
      className={imgClassName}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}
```

- [ ] **Step 3: Usar `<Favicon>` en `LinkCard` (`src/components/LinkCard.tsx`)**

Cambios:
1. Import: quitar `useState` de `react` (ya no se usa), y cambiar el import de `lib/url` de `{ faviconUrl, getDomain, initials }` a `{ getDomain }`; agregar `import { Favicon } from './ui/Favicon'`.
2. Borrar la línea `const [imgFailed, setImgFailed] = useState(false)`.
3. Reemplazar el contenido del badge (el bloque `{imgFailed ? (...) : (<img .../>)}`) por:
```tsx
        <Favicon url={link.url} title={link.title} imgClassName="h-6 w-6" />
```
(El `<div>` del badge con su `style` de color se mantiene igual; solo cambia su contenido.)

- [ ] **Step 4: Preview del `LinkFormModal` usa `faviconSources` (`src/components/modals/LinkFormModal.tsx`)**

1. En el import de `lib/url`, cambiar `faviconUrl` por `faviconSources`.
2. En el preview, cambiar `src={faviconUrl(url)}` por `src={faviconSources(url)[0]}` (se mantiene el `imgFailed`/`onError` existente; una sola fuente en el preview es suficiente).

- [ ] **Step 5: Verificar build**

Run: `pnpm build`
Expected: PASS (exit 0; sin imports sin usar ni errores TS).

- [ ] **Step 6: Commit**

```bash
git add src/lib/url.ts src/components/ui/Favicon.tsx src/components/LinkCard.tsx src/components/modals/LinkFormModal.tsx
git commit -m "feat(ui): iconos automaticos con mayor resolucion y cadena de fallback"
```

---

### Task 3: Panel de gestión por departamento

**Files:**
- Create: `src/components/admin/WorkspaceLinksPanel.tsx`
- Modify: `src/components/SettingsFab.tsx` (botón "Gestión de enlaces")
- Modify: `src/components/Board.tsx` (montar el panel)

**Interfaces:**
- Consumes: `useUI` (`workspaceLinksOpen`, `closeWorkspaceLinks`, `openWorkspaceLinks`, `openAddLink`, `openEditLink`) de Task 1; `Favicon` de Task 2; `useStore` (`links`, `groupLinks`, `removeLink`); `useGroups` (`groups`, `load`).

- [ ] **Step 1: Crear `WorkspaceLinksPanel` (`src/components/admin/WorkspaceLinksPanel.tsx`)**

```tsx
import { useEffect, useState } from 'react'
import { Plus, Pen, Trash } from 'reicon-react'
import type { ReactNode } from 'react'
import { Modal } from '../ui/Modal'
import { Favicon } from '../ui/Favicon'
import { useUI } from '../../store/useUI'
import { useStore } from '../../store/useStore'
import { useGroups } from '../../store/useGroups'
import { getDomain } from '../../lib/url'
import type { LinkItem } from '../../types'

export function WorkspaceLinksPanel() {
  const open = useUI((s) => s.workspaceLinksOpen)
  const close = useUI((s) => s.closeWorkspaceLinks)
  const openAddLink = useUI((s) => s.openAddLink)
  const openEditLink = useUI((s) => s.openEditLink)
  const links = useStore((s) => s.links) // globales (sin depto)
  const groupLinks = useStore((s) => s.groupLinks) // por depto (admin ve todos)
  const removeLink = useStore((s) => s.removeLink)
  const groups = useGroups((s) => s.groups)
  const loadGroups = useGroups((s) => s.load)
  const [activeTab, setActiveTab] = useState<string>('global') // 'global' | groupId

  useEffect(() => {
    if (open) void loadGroups()
  }, [open, loadGroups])

  const items: LinkItem[] =
    activeTab === 'global'
      ? links
      : groupLinks.find((gl) => gl.group.id === activeTab)?.links ?? []

  const onAdd = () => openAddLink('workspace', '', activeTab === 'global' ? [] : [activeTab])

  return (
    <Modal open={open} onClose={close} title="Gestión de enlaces">
      {/* pestañas */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <TabButton active={activeTab === 'global'} onClick={() => setActiveTab('global')}>
          Globales
        </TabButton>
        {groups.map((g) => (
          <TabButton key={g.id} active={activeTab === g.id} onClick={() => setActiveTab(g.id)}>
            {g.name}
          </TabButton>
        ))}
      </div>

      {/* lista de la pestaña activa */}
      <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">Sin enlaces en esta sección.</p>
        )}
        {items.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.06] text-xs font-semibold text-slate-300">
              <Favicon url={l.url} title={l.title} imgClassName="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">{l.title}</p>
              <p className="truncate text-xs text-slate-500">{getDomain(l.url)}</p>
            </div>
            <button
              onClick={() => openEditLink('workspace', l.id)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
              title="Editar"
            >
              <Pen size={15} />
            </button>
            <button
              onClick={() => removeLink(l.id)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
              title="Eliminar"
            >
              <Trash size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* agregar */}
      <button
        onClick={onAdd}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
      >
        <Plus size={16} />
        Agregar enlace
      </button>
    </Modal>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
          : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Botón "Gestión de enlaces" en `SettingsFab.tsx`**

1. En el import de `reicon-react`, agregar `Grid`: `import { Gear, Image, ChevronDown, Users, Grid } from 'reicon-react'`.
2. Agregar el selector del store: `const openWorkspaceLinks = useUI((s) => s.openWorkspaceLinks)` (junto a `openGroupsPanel`).
3. Debajo del botón "Grupos y usuarios" (después de su `</button>`), agregar:
```tsx
          <button
            onClick={() => {
              openWorkspaceLinks()
              setOpen(false)
            }}
            className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
          >
            <Grid size={16} className="text-slate-400" />
            <span className="flex-1 text-left">Gestión de enlaces</span>
          </button>
```

- [ ] **Step 3: Montar el panel en `Board.tsx`**

1. Agregar el import: `import { WorkspaceLinksPanel } from './admin/WorkspaceLinksPanel'`.
2. Junto a `<GroupsPanel />`, agregar `<WorkspaceLinksPanel />`.

- [ ] **Step 4: Verificar build**

Run: `pnpm build`
Expected: PASS (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/WorkspaceLinksPanel.tsx src/components/SettingsFab.tsx src/components/Board.tsx
git commit -m "feat(admin): panel de gestion de enlaces con pestanas por departamento"
```

---

### Task 4: Tablero de Workspace solo-lectura

**Files:**
- Modify: `src/components/LinkGrid.tsx` (sección Workspace `canAdd={false}`)
- Modify: `src/components/LinkCard.tsx` (`canManage = kind === 'favorite'`; quitar `useAuth`)

**Interfaces:**
- Consumes: nada nuevo.

- [ ] **Step 1: `LinkGrid` — Workspace sin botón "Agregar"**

En `src/components/LinkGrid.tsx`, en la sección `Workspace` (el `<Section ... title="Workspace" ...>`), cambiar únicamente `canAdd={isAdmin}` por `canAdd={false}`. (Las secciones por grupo ya son `canAdd={false}`.)

No tocar nada más: `isAdmin` sigue usándose en el rótulo del bloque por grupo (`isAdmin ? 'Enlaces por grupo' : 'De mis grupos'`) y `openAddLink` sigue usándose en el `onAdd` de la sección Favoritos, así que ambos siguen en uso y no hay imports que quitar.

- [ ] **Step 2: `LinkCard` — Workspace solo-lectura**

En `src/components/LinkCard.tsx`:
1. Cambiar `const canManage = kind === 'favorite' || isAdmin` por:
```tsx
  const canManage = kind === 'favorite'
```
2. Borrar la línea `const isAdmin = useAuth((s) => s.user?.role === 'admin')` y el import `import { useAuth } from '../store/useAuth'` (queda sin uso).

- [ ] **Step 3: Verificar build**

Run: `pnpm build`
Expected: PASS (exit 0; sin variables/imports sin usar).

- [ ] **Step 4: Commit**

```bash
git add src/components/LinkGrid.tsx src/components/LinkCard.tsx
git commit -m "feat(board): tablero de Workspace solo-lectura (gestion movida al panel)"
```

---

### Task 5: Verificación runtime

**Files:** ninguno (verificación).

**Prerequisitos:** Postgres local + dev server (ver `SETUP.md`). El login autenticado lo hace el usuario (no se ingresan contraseñas por automatización).

- [ ] **Step 1: Build de producción**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 2: Levantar y revisar (dev server)**

Con el dev server corriendo y sesión admin iniciada: abrir el engranaje → "Gestión de enlaces". Confirmar:
- Pestañas: "Globales" + una por cada departamento (incluidos vacíos).
- Agregar un enlace desde una pestaña de depto → el modal abre con ese depto preseleccionado en los chips; al guardar aparece en esa pestaña.
- Editar/eliminar desde una fila funciona.
- El tablero ya **no** muestra el botón "Agregar" de Workspace ni lápiz/basura en las tarjetas de Workspace (los Favoritos sí).
- Los iconos cargan nítidos; los que fallan en la 1ª fuente caen a la 2ª o a iniciales (revisar `read_console_messages` para errores de red esperados de favicons, no de la app).

## Notas de despliegue

- Frontend-only: sin migración ni backup especial.
- PR contra `origin` (PT-MauIT), base `master`. Merge a `master` para producción.
