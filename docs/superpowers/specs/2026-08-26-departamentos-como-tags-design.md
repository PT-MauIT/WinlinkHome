# Departamentos como tags en el tablero (admin) — Diseño

**Fecha:** 2026-08-26
**Rama:** `feat/departamentos-como-tags`
**Estado:** aprobado, listo para plan de implementación

## Problema

En la vista del admin, la sección "ENLACES POR GRUPO" apila una sección por
departamento (Administrativos, TI, …). Cada departamento nuevo hace **crecer el
tablero verticalmente**. El admin, que ve **todos** los departamentos, es quien
más lo sufre.

Además, tras la iteración anterior la gestión de enlaces quedó en un panel del
engranaje ("Gestión de enlaces") con el tablero en solo-lectura. El usuario
quiere gestionar desde el tablero mismo.

## Objetivo

Para el **admin**, en las vistas **Workspace** e **Inicio**: convertir las
secciones apiladas por departamento en una **fila de tags** (pills, al estilo de
las categorías Trabajo/Estudio/…). Se toca el tag de un departamento y se ven
sus enlaces en **una sola sección** debajo, sin crecimiento vertical. El admin
gestiona (agregar/editar/eliminar) ahí mismo.

## Decisiones (del brainstorming)

- **Estructura:** la sección **WORKSPACE** (enlaces globales) se mantiene tal
  cual arriba. Debajo va la fila de tags **solo de departamentos** (sin tab
  "General": lo global es la sección WORKSPACE). Se muestra el departamento
  seleccionado.
- **Alcance:** los tags de departamento son **solo para el admin**. Los
  **miembros** mantienen su vista actual (WORKSPACE + secciones apiladas de sus
  grupos, solo-lectura).
- **Categorías:** se conservan intactas — la fila de filtro de categorías sigue
  arriba (color + filtro). Sin migración.
- **Gestión inline (admin):** se **revierte el solo-lectura para el admin**;
  vuelve a agregar/editar/eliminar en el tablero.
- **Se elimina** el panel del engranaje "Gestión de enlaces" (redundante).
- **Frontend-only:** sin cambios de backend ni BD. Datos existentes:
  `useGroups` (admin), `useStore.links` + `groupLinks`.

## Diseño

### 1. Estado (`src/store/useStore.ts`)
- Agregar `activeDept: string | null` (departamento seleccionado) y
  `setActiveDept(id: string | null)`. Inicial `null`.
- El componente calcula el **departamento efectivo**: si `activeDept` está en la
  lista de grupos, se usa; si no (null o borrado), se usa el primero. Así hay un
  departamento seleccionado por defecto y hay fallback si se elimina uno.

### 2. Fila de tags (`src/components/DeptTabs.tsx`, nuevo)
- Componente presentacional: recibe `groups: Group[]`, `activeId: string | null`,
  `onSelect: (id: string) => void`.
- Render: una pill por grupo, con el **mismo estilo** que los chips de
  `CategoryFilter` (`rounded-full border px-3.5 py-1.5`, activo
  `border-white/25 bg-white/10 text-white`, inactivo
  `border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]`), sin
  el punto de color. Envuelto en `flex flex-wrap gap-2`.
- No renderiza nada si `groups.length === 0`.

### 3. Tablero (`src/components/LinkGrid.tsx`)
Se bifurca por rol. `filterList` (categoría + búsqueda) y el componente `Section`
existentes se reutilizan.

- **Admin** (`isAdmin`):
  1. Sección **WORKSPACE** (globales, `items = filterList(links)`), con
     `canAdd={true}` y `onAdd={() => openAddLink('workspace')}`.
  2. Un rótulo "Enlaces por grupo" + **`<DeptTabs>`** (grupos desde
     `useGroups().groups`, incluidos vacíos; activo = departamento efectivo;
     `onSelect = setActiveDept`).
  3. **Una** `Section` del departamento efectivo: `title = group.name`,
     `items = filterList(groupLinks.find(gl => gl.group.id === effectiveDept)?.links ?? [])`,
     `kind="workspace"`, `canAdd={true}`,
     `onAdd={() => openAddLink('workspace', '', [effectiveDept])}`. Si no hay
     grupos, no se renderiza ni el rótulo ni la sección.
  4. **Favoritos** cuando corresponde (`view === 'all' || view === 'favorites'`),
     igual que hoy.
  - Cargar grupos para el admin: `useEffect(() => { if (isAdmin) void loadGroups() }, [isAdmin, loadGroups])`.
  - Aplica en las vistas que muestran workspace (`view === 'all' || view === 'workspace'`),
    o sea Inicio y Workspace.
- **Miembro** (`!isAdmin`): **sin cambios** — se conserva el render actual
  (WORKSPACE `canAdd={false}` + secciones apiladas de `groupLinks` + Favoritos).

### 4. Tarjetas (`src/components/LinkCard.tsx`)
- Revertir a `const canManage = kind === 'favorite' || isAdmin` (hoy es solo
  `kind === 'favorite'`). Re-agregar `const isAdmin = useAuth((s) => s.user?.role === 'admin')`
  y el import `import { useAuth } from '../store/useAuth'`. Así el admin recupera
  editar/eliminar en las tarjetas de Workspace; los miembros siguen igual.

### 5. Quitar el panel del engranaje
- **Borrar** `src/components/admin/WorkspaceLinksPanel.tsx`.
- `src/components/SettingsFab.tsx`: quitar el botón "Gestión de enlaces" (y el
  import `Grid` si queda sin uso, y el selector `openWorkspaceLinks`).
- `src/components/Board.tsx`: quitar `<WorkspaceLinksPanel />` y su import.
- `src/store/useUI.ts`: quitar `workspaceLinksOpen`, `openWorkspaceLinks`,
  `closeWorkspaceLinks`. **Conservar** `presetGroupIds` y la firma
  `openAddLink(kind, prefillUrl?, presetGroupIds?)` (los usa el "Agregar" por
  departamento del tablero).

## Casos borde

- Admin sin departamentos → solo la sección WORKSPACE (sin fila de tags).
- Departamento vacío → su tag existe; al seleccionarlo, la sección muestra el
  estado vacío con "Agregar enlace" (el admin puede agregar el primero).
- Un enlace en 2 departamentos → aparece en cada tag de sus departamentos.
- El filtro de categorías (arriba) y la búsqueda siguen aplicando a lo que se
  muestra (WORKSPACE y el departamento seleccionado).

## Verificación

Sin framework de tests (por diseño). `pnpm build` (tsc + vite) verde. Runtime
por el dev server (login del usuario): admin ve la fila de tags de departamento
en lugar de las secciones apiladas; tocar un tag muestra sus enlaces; agregar
preselecciona el depto; editar/eliminar funcionan; el miembro ve su vista igual
que antes; el engranaje ya no tiene "Gestión de enlaces".

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/store/useStore.ts` | `activeDept` + `setActiveDept` |
| `src/components/DeptTabs.tsx` | **nuevo** — fila de tags de departamento (estilo chip) |
| `src/components/LinkGrid.tsx` | bifurcación admin (WORKSPACE + DeptTabs + sección del depto) / miembro (sin cambios); cargar `useGroups` para admin |
| `src/components/LinkCard.tsx` | `canManage = kind === 'favorite' || isAdmin` (revertir solo-lectura) |
| `src/components/SettingsFab.tsx` | quitar botón "Gestión de enlaces" |
| `src/components/Board.tsx` | quitar `<WorkspaceLinksPanel />` |
| `src/store/useUI.ts` | quitar `workspaceLinksOpen` + open/close (conservar `presetGroupIds`) |
| `src/components/admin/WorkspaceLinksPanel.tsx` | **borrar** |
