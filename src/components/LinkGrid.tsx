import { useMemo } from 'react'
import { Bookmark, Plus } from 'reicon-react'
import type { Category, LinkItem } from '../types'
import { useStore } from '../store/useStore'
import { useUI, type LinkKind } from '../store/useUI'
import { useAuth } from '../store/useAuth'
import { getDomain } from '../lib/url'
import { LinkCard } from './LinkCard'

export function LinkGrid() {
  const links = useStore((s) => s.links)
  const favorites = useStore((s) => s.favorites)
  const categories = useStore((s) => s.categories)
  const activeCategoryId = useStore((s) => s.activeCategoryId)
  const query = useStore((s) => s.query)
  const view = useStore((s) => s.view)
  const openAddLink = useUI((s) => s.openAddLink)
  const isAdmin = useAuth((s) => s.user?.role === 'admin')

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  const filterList = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (list: LinkItem[]) =>
      list
        .filter((l) => activeCategoryId === null || l.categoryId === activeCategoryId)
        .filter(
          (l) =>
            !q ||
            l.title.toLowerCase().includes(q) ||
            getDomain(l.url).toLowerCase().includes(q),
        )
        .sort((a, b) => a.createdAt - b.createdAt)
  }, [activeCategoryId, query])

  const showWorkspace = view === 'all' || view === 'workspace'
  const showFavorites = view === 'all' || view === 'favorites'

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
}

interface SectionProps {
  title: string
  subtitle: string
  items: LinkItem[]
  kind: LinkKind
  categoryById: Map<string, Category>
  canAdd: boolean
  onAdd: () => void
  emptyLabel: string
}

function Section({
  title,
  subtitle,
  items,
  kind,
  categoryById,
  canAdd,
  onAdd,
  emptyLabel,
}: SectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {canAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/25 hover:text-white"
          >
            <Plus size={14} />
            Agregar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <Bookmark size={26} className="text-slate-600" />
          <p className="mt-2.5 text-sm text-slate-400">{emptyLabel}</p>
          {canAdd && (
            <button
              onClick={onAdd}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/15"
            >
              <Plus size={16} />
              Agregar enlace
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              kind={kind}
              category={link.categoryId ? categoryById.get(link.categoryId) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
