# Departamentos como tags en el tablero (admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Para el admin, reemplazar las secciones apiladas por departamento por una fila de tags (estilo categorías); tocar un depto muestra sus enlaces en una sola sección, con gestión inline, y se elimina el panel del engranaje.

**Architecture:** Frontend-only. Nuevo componente presentacional `DeptTabs` (pills) + estado `activeDept` en el store. `LinkGrid` bifurca por rol: admin → WORKSPACE + tags + sección del depto seleccionado; miembro → sin cambios. Se revierte el solo-lectura del admin y se borra `WorkspaceLinksPanel`.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind 4, Zustand, `reicon-react`.

**Spec:** `docs/superpowers/specs/2026-08-26-departamentos-como-tags-design.md`

## Global Constraints

- **Frontend-only.** Sin cambios de backend ni BD. Sin migración.
- **Solo el admin** obtiene los tags de departamento; los **miembros** mantienen su vista actual (WORKSPACE + secciones apiladas, solo-lectura).
- **Categorías intactas** (fila de filtro arriba se mantiene; sin tocar `CategoryFilter`).
- **Sin framework de tests** (por diseño). Verificación: `pnpm build` (tsc + vite) exit 0. Runtime al final por el dev server.
- **Diseño glass.** Los tags de departamento usan el mismo estilo de pill que los chips de `CategoryFilter` (`rounded-full border px-3.5 py-1.5`, activo `border-white/25 bg-white/10 text-white`, inactivo `border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]`), sin punto de color.
- **Git.** Rama `feat/departamentos-como-tags`. PR/merge a `origin` (PT-MauIT), base `master`. Cada commit termina con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Quitar el panel del engranaje + limpieza de `useUI`

**Files:**
- Delete: `src/components/admin/WorkspaceLinksPanel.tsx`
- Modify: `src/components/SettingsFab.tsx`
- Modify: `src/components/Board.tsx`
- Modify: `src/store/useUI.ts`

**Interfaces:**
- Produces: `useUI` ya NO expone `workspaceLinksOpen` / `openWorkspaceLinks` / `closeWorkspaceLinks`. Conserva `presetGroupIds` y `openAddLink(kind, prefillUrl?, presetGroupIds?)`.

- [ ] **Step 1: Borrar el componente del panel**

```bash
git rm src/components/admin/WorkspaceLinksPanel.tsx
```

- [ ] **Step 2: `SettingsFab.tsx` — quitar el botón "Gestión de enlaces"**

En `src/components/SettingsFab.tsx`:
1. Eliminar el bloque `<button>` cuyo texto es "Gestión de enlaces" (el que llama `openWorkspaceLinks()` y `setOpen(false)`).
2. Eliminar la línea del selector `const openWorkspaceLinks = useUI((s) => s.openWorkspaceLinks)`.
3. En el import de `reicon-react`, quitar `Grid` (queda sin uso): dejar `import { Gear, Image, ChevronDown, Users } from 'reicon-react'`.

- [ ] **Step 3: `Board.tsx` — quitar el montaje del panel**

En `src/components/Board.tsx`:
1. Eliminar el import `import { WorkspaceLinksPanel } from './admin/WorkspaceLinksPanel'`.
2. Eliminar la línea `<WorkspaceLinksPanel />` del JSX.

- [ ] **Step 4: `useUI.ts` — quitar el estado del panel**

En `src/store/useUI.ts`:
1. En `interface UIStore`, eliminar la línea `workspaceLinksOpen: boolean` y las dos firmas `openWorkspaceLinks: () => void` / `closeWorkspaceLinks: () => void`.
2. En el `create`, eliminar `workspaceLinksOpen: false,` del estado inicial y las dos acciones `openWorkspaceLinks: () => set({ workspaceLinksOpen: true }),` / `closeWorkspaceLinks: () => set({ workspaceLinksOpen: false }),`.
3. **No tocar** `presetGroupIds` ni la firma de `openAddLink` (los usa el tablero).

- [ ] **Step 5: Verificar build**

Run: `pnpm build`
Expected: PASS (exit 0; sin referencias colgantes a `WorkspaceLinksPanel`/`workspaceLinksOpen`, sin imports sin usar).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(admin): elimina el panel de gestion de enlaces del engranaje"
```

---

### Task 2: Estado `activeDept` + componente `DeptTabs`

**Files:**
- Modify: `src/store/useStore.ts`
- Create: `src/components/DeptTabs.tsx`

**Interfaces:**
- Produces:
  - `useStore().activeDept: string | null`, `useStore().setActiveDept(id: string | null): void`
  - `DeptTabs({ groups: Group[], activeId: string | null, onSelect: (id: string) => void })`

- [ ] **Step 1: `useStore.ts` — agregar `activeDept`**

En `src/store/useStore.ts`:
1. En la interfaz `Store`, junto a `activeCategoryId: string | null`, agregar:
```ts
  activeDept: string | null
```
   y junto a `setActiveCategory`, agregar la firma:
```ts
  setActiveDept: (id: string | null) => void
```
2. En el estado inicial del `create`, junto a `activeCategoryId: null,`, agregar:
```ts
  activeDept: null,
```
3. Junto a `setActiveCategory: (id) => set({ activeCategoryId: id }),`, agregar:
```ts
  setActiveDept: (id) => set({ activeDept: id }),
```

- [ ] **Step 2: Crear `DeptTabs` (`src/components/DeptTabs.tsx`)**

```tsx
import type { Group } from '../types'

interface DeptTabsProps {
  groups: Group[]
  activeId: string | null
  onSelect: (id: string) => void
}

/** Fila de tags de departamento, al estilo de los chips de CategoryFilter. */
export function DeptTabs({ groups, activeId, onSelect }: DeptTabsProps) {
  if (groups.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => {
        const active = g.id === activeId
        return (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              active
                ? 'border-white/25 bg-white/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
            }`}
          >
            {g.name}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Verificar build**

Run: `pnpm build`
Expected: PASS (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.ts src/components/DeptTabs.tsx
git commit -m "feat(board): estado activeDept y componente DeptTabs (tags de departamento)"
```

---

### Task 3: `LinkGrid` bifurcado por rol + revertir solo-lectura en `LinkCard`

**Files:**
- Modify: `src/components/LinkGrid.tsx`
- Modify: `src/components/LinkCard.tsx`

**Interfaces:**
- Consumes: `DeptTabs` (Task 2), `useStore().activeDept`/`setActiveDept` (Task 2), `useGroups().groups`/`load`, `useStore().groupLinks`/`links`, `openAddLink('workspace', '', [deptId])`.

- [ ] **Step 1: `LinkCard.tsx` — revertir a gestión del admin**

En `src/components/LinkCard.tsx`:
1. Re-agregar el import: `import { useAuth } from '../store/useAuth'`.
2. Dentro del componente, re-agregar: `const isAdmin = useAuth((s) => s.user?.role === 'admin')`.
3. Cambiar `const canManage = kind === 'favorite'` por:
```tsx
  const canManage = kind === 'favorite' || isAdmin
```

- [ ] **Step 2: `LinkGrid.tsx` — bifurcar admin / miembro**

En `src/components/LinkGrid.tsx`:

1. Ajustar imports al inicio:
```tsx
import { useEffect, useMemo } from 'react'
```
   y agregar:
```tsx
import { useGroups } from '../store/useGroups'
import { DeptTabs } from './DeptTabs'
```

2. Dentro de `LinkGrid`, agregar estos reads (junto a los `useStore` existentes):
```tsx
  const activeDept = useStore((s) => s.activeDept)
  const setActiveDept = useStore((s) => s.setActiveDept)
  const groups = useGroups((s) => s.groups)
  const loadGroups = useGroups((s) => s.load)
```

3. Agregar el efecto de carga de grupos para el admin (después de los `useMemo` existentes):
```tsx
  useEffect(() => {
    if (isAdmin) void loadGroups()
  }, [isAdmin, loadGroups])

  const effectiveDept = groups.some((g) => g.id === activeDept)
    ? activeDept
    : groups[0]?.id ?? null
```

4. Reemplazar el bloque de secciones por grupo actual (el `{showWorkspace && groupLinks.some(...) && ( ... )}`) por DOS bloques — uno admin (tags) y uno miembro (apilado). El `return` completo queda así (la sección WORKSPACE cambia `canAdd={false}` → `canAdd={isAdmin}`, y la sección Favoritos no cambia):

```tsx
  return (
    <div className="space-y-9">
      {showWorkspace && (
        <Section
          title="Workspace"
          subtitle="Herramientas base del equipo"
          items={filterList(links)}
          kind="workspace"
          categoryById={categoryById}
          canAdd={isAdmin}
          onAdd={() => openAddLink('workspace')}
          emptyLabel={
            isAdmin
              ? 'Agrega las herramientas base del equipo.'
              : 'El administrador aún no agregó herramientas.'
          }
        />
      )}

      {/* Admin: tags de departamento + sección del depto seleccionado */}
      {showWorkspace && isAdmin && groups.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Enlaces por grupo
          </p>
          <DeptTabs groups={groups} activeId={effectiveDept} onSelect={setActiveDept} />
          {effectiveDept && (
            <Section
              key={effectiveDept}
              title={groups.find((g) => g.id === effectiveDept)?.name ?? ''}
              subtitle="Herramientas del grupo"
              items={filterList(
                groupLinks.find((gl) => gl.group.id === effectiveDept)?.links ?? [],
              )}
              kind="workspace"
              categoryById={categoryById}
              canAdd
              onAdd={() => openAddLink('workspace', '', effectiveDept ? [effectiveDept] : [])}
              emptyLabel="Aún no hay enlaces en este departamento. Agrega el primero."
            />
          )}
        </div>
      )}

      {/* Miembro: secciones apiladas de sus grupos (como hoy) */}
      {showWorkspace &&
        !isAdmin &&
        groupLinks.some((gl) => filterList(gl.links).length > 0) && (
          <div className="space-y-9">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              De mis grupos
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

      {showFavorites && (
        <Section
          title="Favoritos"
          subtitle="Tus enlaces personales"
          items={filterList(favorites)}
          kind="favorite"
          categoryById={categoryById}
          canAdd
          onAdd={() => openAddLink('favorite')}
          emptyLabel="Aún no tienes favoritos. Agrega el primero."
        />
      )}
    </div>
  )
```

- [ ] **Step 3: Verificar build**

Run: `pnpm build`
Expected: PASS (exit 0; sin variables/imports sin usar — `useEffect`, `useGroups`, `DeptTabs`, `activeDept`, `setActiveDept`, `groups`, `loadGroups`, `effectiveDept` deben quedar todos en uso).

- [ ] **Step 4: Commit**

```bash
git add src/components/LinkGrid.tsx src/components/LinkCard.tsx
git commit -m "feat(board): tags de departamento para el admin, gestion inline; miembro sin cambios"
```

---

### Task 4: Verificación runtime

**Files:** ninguno (verificación).

**Prerequisitos:** Postgres local + dev server (ver `SETUP.md`). El login lo hace el usuario (no se ingresan contraseñas por automatización).

- [ ] **Step 1: Build de producción**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 2: Revisar en el dev server (sesión admin)**

- El tablero (Workspace e Inicio) muestra la sección WORKSPACE, luego el rótulo "Enlaces por grupo" con una **fila de tags** (uno por departamento), en vez de secciones apiladas.
- Tocar un tag muestra los enlaces de ese departamento en una sola sección.
- "Agregar" en esa sección abre el modal con el departamento **preseleccionado**; al guardar aparece bajo ese tag.
- Editar/eliminar funcionan en las tarjetas de Workspace (globales y del depto).
- El engranaje ya **no** tiene "Gestión de enlaces".

- [ ] **Step 3: Revisar como miembro (si es posible)**

- El miembro ve su vista igual que antes: WORKSPACE + secciones apiladas de sus grupos, sin controles de admin.

## Notas de despliegue

- Frontend-only: sin migración ni backup especial.
- PR contra `origin` (PT-MauIT), base `master`. Merge a `master` para producción.
