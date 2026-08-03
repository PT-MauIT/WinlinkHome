# Enlaces de Workspace por grupo — Diseño

**Fecha:** 2026-08-03
**Rama:** `feat/enlaces-workspace-por-grupo`
**Estado:** aprobado, listo para plan de implementación

## Problema

Hoy se pueden crear grupos y asignarles personas, pero los grupos **casi no
hacen nada**. Su único efecto funcional es segmentar noticias
(`listNewsForUser`, [db.js:437](../../../server/db.js)). El **Workspace** —el
tablero de herramientas que es el corazón de la app— es **100% global**:
`getState` devuelve los mismos enlaces a todo usuario, sin importar su grupo
([db.js:466](../../../server/db.js)). `user.groups` se carga pero el frontend no
lo usa para nada en el tablero.

Resultado: asignar a alguien a un grupo no cambia lo que ve en su Home.

## Objetivo

Que un enlace de Workspace pueda **asignarse a uno o más grupos**, de forma que
cada usuario vea, en su Home, los enlaces **globales** más los de **sus grupos**,
presentados en una **sección aparte "De mis grupos"** debajo del tablero global,
etiquetada por grupo.

## No-objetivos (YAGNI)

- No se tocan los **favoritos** (siguen siendo por usuario, sin grupos).
- No hay navegación nueva (ni pestañas ni filtros por grupo); solo una sección
  adicional en el mismo tablero.
- No se agregan permisos por grupo, ni contenido de bienvenida por grupo, ni se
  modifica la segmentación de noticias.
- No se monta una infraestructura de tests (el proyecto no tiene ninguna hoy).

## Restricción dura: cero pérdida de datos en producción

Producción está **en uso por usuarios reales**. El cambio debe ser:

1. **Migración additive-only e idempotente.** Solo se agrega
   `CREATE TABLE IF NOT EXISTS link_groups`. **Prohibido** `ALTER`, `DROP`,
   `TRUNCATE` o cualquier modificación de tablas existentes (`links`, `users`,
   `groups`, `news`, `categories`, `user_links`, `user_groups`, `settings`).
2. **Neutral en comportamiento hasta que un admin actúe.** Tras el deploy, los
   enlaces existentes no tienen filas en `link_groups`, así que quedan
   **globales** y todos los usuarios ven exactamente lo mismo que hoy. Un enlace
   solo se vuelve de-grupo cuando un admin lo asigna a propósito.
3. **Sin re-seed.** No se toca `seedIfEmpty()` (ya está guardado por
   `initialized = '1'` y usa `ON CONFLICT DO NOTHING`).

**Verificación previa (validada en brainstorming):** `initSchema()` aplica el
esquema con `CREATE TABLE IF NOT EXISTS` en cada arranque, así que agregar la
tabla al `SCHEMA` es toda la migración necesaria. Los `DELETE` del código son
CRUD disparado por el usuario, no corren en el deploy.

**Nota de ops (fuera del feature):** la persistencia depende del volumen
`pgdata`. Un redeploy normal lo conserva; solo `down -v` / reset de volúmenes lo
borraría. Recomendación estándar: `pg_dump` de respaldo antes de desplegar.

## Modelo de datos

Nueva tabla de unión muchos-a-muchos:

```sql
CREATE TABLE IF NOT EXISTS link_groups (
  link_id  TEXT NOT NULL REFERENCES links(id)  ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_link_groups_group ON link_groups(group_id);
```

**Regla de visibilidad:**
- Enlace **sin** filas en `link_groups` → **global** (lo ve todo usuario).
- Enlace **con** filas → visible solo para miembros de esos grupos.
- **Admin** ve todos los enlaces (globales y de todos los grupos).

El `ON DELETE CASCADE` solo limpia asignaciones cuando ya se borra un enlace o un
grupo (comportamiento existente); nunca borra un enlace ni un grupo por sí mismo.

## Backend

### `server/db.js`

- Agregar la tabla al `SCHEMA` (única migración).
- **`getState(user)`** deja de devolver todos los links y pasa a devolver:
  - `links`: solo enlaces **globales** (sin asignación de grupo), cada uno con
    `groupIds: []`.
  - `groupLinks`: `[{ group: { id, name, slug }, links: LinkItem[] }]`.
    - **miembro** → sus grupos que tengan ≥1 enlace.
    - **admin** → **todos** los grupos que tengan ≥1 enlace (para verlos/gestionarlos).
    - Cada `LinkItem` incluye su `groupIds` completo (para que editar preserve la
      pertenencia múltiple).
  - `favorites`, `background`, `categories`, `user.groups`: sin cambios.
- Nuevas funciones internas:
  - `getGlobalWorkspaceLinks()` → links sin asignación.
  - `getGroupWorkspaceLinks(user)` → agrupados por grupo según la regla de arriba.
  - `setLinkGroups(linkId, groupIds)` → reemplaza asignaciones en transacción
    (mismo patrón que `setUserGroups`, [db.js:267](../../../server/db.js)).
- `addLink` / `updateLink` aceptan `groupIds` y llaman a `setLinkGroups`.
  `removeLink` no cambia (el `CASCADE` limpia `link_groups`).

### `server/index.js`

- `POST /links` y `PUT /links/:id` (ya `requireAdmin`) leen
  `groupIds: string[]` del body (default `[]`) y lo pasan a la capa db.
- Sin endpoints nuevos.

## Frontend

### Tipos (`src/types.ts`)
- `LinkItem` gana `groupIds?: string[]`.
- Nuevo `interface GroupLinks { group: Group; links: LinkItem[] }`.

### API (`src/lib/api.ts`)
- `LinkInput` gana `groupIds: string[]`.
- `StatePayload` gana `groupLinks: GroupLinks[]`.

### Store (`src/store/useStore.ts`)
- Guardar `groupLinks` en el estado.
- `addLink` / `updateLink` / `removeLink` de **Workspace**: como asignar un grupo
  mueve el enlace de sección, tras la mutación se **recarga** el estado
  (`load()`) para mantener las secciones consistentes. Favoritos siguen
  optimistas (no cambian de sección).

### Vista de usuario (`src/components/LinkGrid.tsx`)
Orden del tablero:
1. **Workspace** (globales) — sección existente, sin cambios visibles.
2. **Sección de grupos** — un rótulo lead-in (`"De mis grupos"` para miembros;
   `"Enlaces por grupo"` para admin, que ve todos) y luego **una `Section` por
   grupo** (reusa el componente `Section` existente, título = nombre del grupo,
   subtítulo "Herramientas del grupo"). Se muestran con la misma regla de `view`
   que Workspace (`view === 'all' || view === 'workspace'`).
3. **Favoritos** — sección existente, sin cambios.

Un enlace en 2 de mis grupos aparece bajo ambos (coherente con el etiquetado por
grupo). El filtro de categorías y la búsqueda aplican también a las secciones de
grupo (mismo `filterList`).

### Vista admin (`src/components/modals/LinkFormModal.tsx`)
- Al crear/editar una herramienta de **Workspace**, mostrar un **selector
  múltiple de grupos** (chips toggle, mismo estilo que `GroupsPanel`
  [GroupsPanel.tsx:104](../../../src/components/admin/GroupsPanel.tsx)).
- 0 grupos = global. Editar precarga `link.groupIds`.
- Cargar la lista de grupos con `useGroups` (ya existe). Solo visible para admin
  y solo en `kind === 'workspace'` (los favoritos no tienen grupos).
- Al guardar, incluir `groupIds` en el payload.

### Dropdowns personalizados (`src/components/ui/Select.tsx`)
Los `<select>` nativos ocultan la flecha con `appearance-none`, pero su **lista
de opciones abierta** usa el estilo del navegador (fondo claro / texto oscuro),
que rompe el tema oscuro y queda ilegible. El estilizado de `<option>` no es
confiable entre navegadores/SO, así que se crea un **componente `Select`
reutilizable** que coincide con el diseño glass y es legible.

- **Componente controlado.** Props: `value`, `onChange`, `options: {value,label}[]`,
  `placeholder`, `disabled`, `className`.
- **Control cerrado:** mismo estilo que la clase `field` (borde `white/10`, fondo
  `white/5`, texto `slate-100`) + chevron (`ChevronDown` de `reicon-react`).
- **Panel abierto:** glass oscuro (fondo tipo `slate-900/95`, `backdrop-blur`,
  borde `white/10`, sombra), opciones con texto `slate-100`, hover
  `bg-white/[0.06]`, la seleccionada con acento esmeralda (coherente con el resto
  de la app). Legible sobre cualquier fondo.
- **Comportamiento:** abre/cierra al hacer clic, cierra al hacer clic fuera y con
  `Escape`, navegación básica por teclado (flechas + Enter). Reposiciona dentro
  del `Modal` sin desbordar.
- **Se aplica a los dos dropdowns existentes:** categoría en `LinkFormModal` y
  grupo en `NewsFormModal`. (El selector múltiple de grupos del feature ya son
  chips, así que no usa `<select>` y no se ve afectado.)

## Flujo end-to-end

1. Admin abre "Agregar" en Workspace → crea "QuickBooks" → asigna grupo
   "Contabilidad" → guardar.
2. El enlace desaparece de la sección global y aparece bajo la sección
   "Contabilidad" en "De mis grupos".
3. Un miembro de "Contabilidad" ve "QuickBooks" en su Home bajo esa sección.
4. Un miembro de otro grupo (o sin grupos) **no** lo ve.
5. El admin ve todas las secciones de grupo, pueda o no pertenecer a ellas.

## Casos borde

- Usuario sin grupos → solo Workspace + Favoritos (idéntico a hoy).
- Grupo sin enlaces → no genera sección (no aparece vacío).
- Borrar un grupo → `CASCADE` quita sus asignaciones; los enlaces que no queden
  en otro grupo vuelven a globales.
- Borrar un enlace → `CASCADE` limpia sus filas en `link_groups`.

## Testing / verificación

El proyecto no tiene framework de tests. Verificación por el dev server
(preview) de los flujos clave:
- Admin asigna un enlace a un grupo → aparece en la sección del grupo.
- Miembro de ese grupo lo ve; miembro de otro grupo / sin grupos, no.
- Admin ve todas las secciones de grupo.
- Enlaces existentes (sin grupo) siguen globales y visibles para todos.
- Los dropdowns (categoría y grupo) abren con estilo glass oscuro, legibles, y
  cierran con clic fuera / `Escape`.

Opcional (no bloqueante): un test puntual de Node para la lógica de filtrado de
`getGroupWorkspaceLinks` / `getGlobalWorkspaceLinks`.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `server/db.js` | tabla `link_groups` en SCHEMA; `getState`; funciones de group-links; `setLinkGroups`; `addLink`/`updateLink` |
| `server/index.js` | `groupIds` en `POST/PUT /links` |
| `src/types.ts` | `LinkItem.groupIds`; `GroupLinks` |
| `src/lib/api.ts` | `LinkInput.groupIds`; `StatePayload.groupLinks` |
| `src/store/useStore.ts` | estado `groupLinks`; recarga en mutaciones de Workspace |
| `src/components/LinkGrid.tsx` | secciones "De mis grupos" |
| `src/components/modals/LinkFormModal.tsx` | selector múltiple de grupos (admin, workspace); usa `Select` para categoría |
| `src/components/ui/Select.tsx` | **nuevo** — dropdown personalizado, legible y acorde al diseño |
| `src/components/news/NewsFormModal.tsx` | usa `Select` para el grupo de la noticia |
