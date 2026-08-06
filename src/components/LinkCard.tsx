import { ArrowRightUp, Pen, Trash } from 'reicon-react'
import type { Category, LinkItem } from '../types'
import { useStore } from '../store/useStore'
import { useUI, type LinkKind } from '../store/useUI'
import { useAuth } from '../store/useAuth'
import { colorOf, tintOf } from '../lib/colors'
import { getDomain } from '../lib/url'
import { Favicon } from './ui/Favicon'

interface LinkCardProps {
  link: LinkItem
  category?: Category
  kind: LinkKind
}

export function LinkCard({ link, category, kind }: LinkCardProps) {
  const openEditLink = useUI((s) => s.openEditLink)
  const removeLink = useStore((s) => s.removeLink)
  const removeFavorite = useStore((s) => s.removeFavorite)
  const isAdmin = useAuth((s) => s.user?.role === 'admin')

  // Favorites are owned by the user (always manageable); workspace links are admin-only.
  const canManage = kind === 'favorite' || isAdmin
  const remove = kind === 'favorite' ? removeFavorite : removeLink

  const accent = colorOf(category?.color)
  const domain = getDomain(link.url)

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-black/30"
    >
      {/* left accent bar */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
      />

      {/* favicon / initials badge */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold"
        style={{ backgroundColor: tintOf(category?.color, 0.18), color: accent }}
      >
        <Favicon url={link.url} title={link.title} imgClassName="h-6 w-6" />
      </div>

      {/* text */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-100">{link.title}</p>
        <p className="truncate text-xs text-slate-500">{domain}</p>
      </div>

      {/* right slot: external-link arrow by default, actions on hover (when allowed) */}
      <div className="relative flex h-8 w-[68px] shrink-0 items-center justify-end">
        <ArrowRightUp
          size={16}
          className={`absolute right-1.5 text-slate-600 transition ${canManage ? 'group-hover:opacity-0' : ''}`}
        />
        {canManage && (
          <div className="absolute right-0 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault()
                openEditLink(kind, link.id)
              }}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
              title="Editar"
            >
              <Pen size={15} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                remove(link.id)
              }}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
              title="Eliminar"
            >
              <Trash size={15} />
            </button>
          </div>
        )}
      </div>
    </a>
  )
}
