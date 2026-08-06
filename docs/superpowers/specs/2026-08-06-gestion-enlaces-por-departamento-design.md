# Panel de gestión de enlaces por departamento + iconos automáticos — Diseño

**Fecha:** 2026-08-06
**Rama:** `feat/gestion-enlaces-por-departamento`
**Estado:** aprobado, listo para plan de implementación

## Problema

Hoy el admin gestiona los enlaces de Workspace **mezclado con la vista de
navegación**: crea desde el botón "Agregar" de la sección Workspace del tablero,
edita/elimina con lápiz/basura sobre cada tarjeta, y asigna departamentos con
chips en el `LinkFormModal`. No hay una superficie ordenada para gestionarlos
por departamento.

Además, los **iconos de los enlaces cargan mal** en varios casos: `faviconUrl`
usa el servicio de Google (`s2/favicons?...&sz=64`) y `LinkCard` solo cae a
iniciales con `onError`. Google devuelve a veces su globo genérico (imagen 200
OK, así que `onError` no se dispara) o un icono de 16px borroso al escalar a
24px.

## Objetivo

1. **Panel de gestión** dedicado, abierto desde el engranaje, con **pestañas por
   departamento** (+ "Globales"), donde el admin hace todo el CRUD de enlaces de
   Workspace de forma ordenada.
2. **Tablero solo-lectura**: quitar del tablero los controles de admin de
   Workspace (botón "Agregar" y lápiz/basura de tarjetas de Workspace).
3. **Iconos automáticos correctos**: mayor resolución + cadena de fallback entre
   fuentes, sin campo manual.

## No-objetivos (YAGNI)

- Sin campo manual de icono (el pedido es que cargue **automáticamente** bien).
- Sin cambios de backend ni de base de datos (se usa todo lo existente).
- Sin reordenar enlaces (drag & drop) dentro de un departamento.
- No se tocan los Favoritos del usuario (conservan sus controles en el tablero).

## Restricción

**Frontend-only.** Cero migración, cero cambio de esquema, cero riesgo de datos
en producción. El feature se arma con endpoints y estado ya existentes
(`useGroups`, `useStore.links` + `useStore.groupLinks`, `LinkFormModal`).

## Diseño

### 1. Panel de gestión (`src/components/admin/WorkspaceLinksPanel.tsx`, nuevo)

Modal (reusa `ui/Modal`) abierto desde el engranaje. Contenido:

- **Barra de pestañas:** `Globales` + una pestaña por cada departamento (grupo).
  Las etiquetas de pestaña salen de `useGroups().groups` (todos los grupos,
  **incluidos los vacíos**, para poder agregar el primer enlace a un depto). La
  pestaña activa se guarda en estado local (`activeTab`: `'global'` o un
  `groupId`).
- **Lista de la pestaña activa** (filas ordenadas): para `Globales` usa
  `useStore().links`; para un departamento usa los `links` de la entrada
  correspondiente de `useStore().groupLinks` (o vacío si el grupo no tiene
  enlaces). Cada fila muestra favicon · título · dominio y dos acciones:
  - **Editar** (lápiz) → `openEditLink('workspace', link.id)` (reusa
    `LinkFormModal`; reasignar depto = togglear chips).
  - **Eliminar** (basura) → `removeLink(link.id)` (borra el enlace por completo).
- **"Agregar enlace"**: en `Globales` → `openAddLink('workspace')`; en una
  pestaña de departamento → `openAddLink('workspace', '', [groupId])`
  (preselecciona ese departamento en los chips del modal).
- Al abrir el panel, cargar grupos si hace falta (`if (open) void loadGroups()`,
  patrón de `GroupsPanel`). Los `links`/`groupLinks` ya los carga el `Board`.
- Un enlace asignado a varios departamentos aparece en cada pestaña de sus
  departamentos (y no en "Globales").

### 2. Estado UI (`src/store/useUI.ts`)

- `linkModal` gana `presetGroupIds: string[]`.
- `openAddLink(kind, prefillUrl = '', presetGroupIds: string[] = [])` guarda
  `presetGroupIds` en `linkModal`. `openEditLink` y `closeLinkModal` lo dejan en
  `[]`.
- Nuevo estado del panel: `workspaceLinksOpen: boolean` + `openWorkspaceLinks()`
  / `closeWorkspaceLinks()` (patrón de `groupsPanelOpen`).

### 3. Modal de alta/edición (`src/components/modals/LinkFormModal.tsx`)

- En la rama "agregar" del efecto de reset, precargar
  `setGroupIds(linkModal.presetGroupIds ?? [])` en vez de `[]`. Todo lo demás
  (chips, submit con `groupIds`) ya existe.

### 4. Tablero solo-lectura

- **`src/components/LinkGrid.tsx`**: la sección `Workspace` pasa a
  `canAdd={false}` (hoy `canAdd={isAdmin}`). Las secciones por grupo ya son
  `canAdd={false}`.
- **`src/components/LinkCard.tsx`**: `canManage` deja de gestionar Workspace:
  `const canManage = kind === 'favorite'` (hoy `kind === 'favorite' || isAdmin`).
  Así las tarjetas de Workspace (globales y por grupo) quedan solo-lectura; los
  Favoritos conservan lápiz/basura. `isAdmin`/`useAuth` quedan sin uso en
  `LinkCard` → eliminar el import y la línea.

### 5. Disparador en el engranaje (`src/components/SettingsFab.tsx`)

- Nuevo botón "Gestión de enlaces" (icono `Bookmark` o `Grid` de
  `reicon-react`) debajo de "Grupos y usuarios", que llama
  `openWorkspaceLinks()` y cierra el panel del engranaje. Solo admin (el
  `SettingsFab` ya es admin-only).

### 6. Panel montado (`src/components/Board.tsx`)

- Renderizar `<WorkspaceLinksPanel />` junto a los otros paneles/modales.

### 7. Iconos automáticos (`src/lib/url.ts` + consumidores)

- Nueva función `faviconSources(url): string[]` que devuelve una lista ordenada:
  1. DuckDuckGo: `https://icons.duckduckgo.com/ip3/${getDomain(url)}.ico`
     (icono limpio; devuelve 404 real cuando no existe → dispara el fallback).
  2. Google alta resolución:
     `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=128`
     (nítido a 24px; último recurso con imagen).
- `faviconUrl` se mantiene (para compatibilidad) devolviendo `faviconSources()[0]`.
- **`LinkCard`**: reemplazar el booleano `imgFailed` por un índice de fuente
  (`srcIdx`). El `<img src={faviconSources(link.url)[srcIdx]}>`; en `onError`
  avanza `srcIdx`; si se agotan las fuentes, mostrar `initials(link.title)`.
- **Preview de `LinkFormModal`**: usar `faviconSources(url)[0]` como `src`; en
  `onError` caer a iniciales (comportamiento actual, una sola fuente en el
  preview es suficiente).

## Casos borde

- Departamento sin enlaces → su pestaña existe (desde `groups`) y muestra un
  estado vacío con "Agregar enlace".
- Sin grupos → el panel muestra solo la pestaña "Globales".
- Enlace en 2 departamentos → aparece en ambas pestañas; eliminar lo borra por
  completo (reasignar = editar y togglear chips).
- Icono inexistente en ambas fuentes → iniciales (como hoy, pero tras probar 2
  fuentes).

## Verificación

Sin framework de tests (por diseño). `pnpm build` (tsc + vite) verde. Runtime
por el dev server: abrir el panel, ver pestañas por departamento, agregar/editar/
eliminar un enlace, confirmar que el tablero ya no muestra controles de admin de
Workspace, y que los iconos cargan nítidos (con fallback a la 2ª fuente / iniciales).

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/admin/WorkspaceLinksPanel.tsx` | **nuevo** — panel con pestañas por depto |
| `src/store/useUI.ts` | `presetGroupIds` en linkModal; `workspaceLinksOpen` + open/close |
| `src/components/modals/LinkFormModal.tsx` | precargar `presetGroupIds` al agregar |
| `src/components/LinkGrid.tsx` | Workspace `canAdd={false}` |
| `src/components/LinkCard.tsx` | `canManage = kind === 'favorite'`; quitar `useAuth` |
| `src/components/SettingsFab.tsx` | botón "Gestión de enlaces" |
| `src/components/Board.tsx` | montar `<WorkspaceLinksPanel />` |
| `src/lib/url.ts` | `faviconSources()`; `faviconUrl` = primera fuente |
