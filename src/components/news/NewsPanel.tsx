import { useEffect } from 'react'
import { Plus, Trash, DirectNotification2 } from 'reicon-react'
import { Modal } from '../ui/Modal'
import { useUI } from '../../store/useUI'
import { useNews } from '../../store/useNews'
import { useAuth } from '../../store/useAuth'

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

export function NewsPanel() {
  const open = useUI((s) => s.newsPanelOpen)
  const close = useUI((s) => s.closeNewsPanel)
  const openForm = useUI((s) => s.openNewsForm)
  const items = useNews((s) => s.items)
  const loaded = useNews((s) => s.loaded)
  const load = useNews((s) => s.load)
  const remove = useNews((s) => s.remove)
  const isAdmin = useAuth((s) => s.user?.role === 'admin')

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  return (
    <Modal open={open} onClose={close} title="Noticias">
      {isAdmin && (
        <button
          onClick={openForm}
          className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07]"
        >
          <Plus size={16} />
          Publicar noticia
        </button>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <DirectNotification2 size={28} className="text-slate-600" />
          <p className="mt-2.5 text-sm text-slate-400">
            {loaded ? 'No hay noticias por ahora.' : 'Cargando…'}
          </p>
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {items.map((n) => (
            <article
              key={n.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-slate-100">{n.title}</h3>
                {isAdmin && (
                  <button
                    onClick={() => remove(n.id)}
                    className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-red-500/15 hover:text-red-300"
                    title="Eliminar"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{n.body}</p>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
                <span>{fmtDate(n.createdAt)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    n.audience === 'group'
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {n.audience === 'group' ? (n.groupName ?? 'Grupo') : 'General'}
                </span>
                {n.authorName && <span>· {n.authorName}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  )
}
