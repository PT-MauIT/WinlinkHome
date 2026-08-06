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
