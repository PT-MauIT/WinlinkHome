import { useMemo } from 'react'
import { Bookmark, Plus } from 'reicon-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { getDomain } from '../lib/url'
import { LinkCard } from './LinkCard'

export function LinkGrid() {
  const links = useStore((s) => s.links)
  const categories = useStore((s) => s.categories)
  const activeCategoryId = useStore((s) => s.activeCategoryId)
  const query = useStore((s) => s.query)
  const openAddLink = useUI((s) => s.openAddLink)

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return links
      .filter((l) => activeCategoryId === null || l.categoryId === activeCategoryId)
      .filter(
        (l) =>
          !q ||
          l.title.toLowerCase().includes(q) ||
          getDomain(l.url).toLowerCase().includes(q),
      )
      .sort((a, b) => a.createdAt - b.createdAt)
  }, [links, activeCategoryId, query])

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <Bookmark size={30} className="text-slate-600" />
        <p className="mt-3 text-slate-400">
          {query.trim()
            ? 'Ningún enlace coincide con tu búsqueda.'
            : 'Aún no hay enlaces en esta categoría.'}
        </p>
        <button
          onClick={() => openAddLink()}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/15"
        >
          <Plus size={16} />
          Agregar enlace
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((link) => (
        <LinkCard
          key={link.id}
          link={link}
          category={link.categoryId ? categoryById.get(link.categoryId) : undefined}
        />
      ))}
    </div>
  )
}
