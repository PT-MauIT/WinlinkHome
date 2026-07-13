import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useUI } from '../../store/useUI'
import { useNews } from '../../store/useNews'
import { useGroups } from '../../store/useGroups'
import type { NewsAudience } from '../../types'

const field =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-white/25'

export function NewsFormModal() {
  const open = useUI((s) => s.newsFormOpen)
  const close = useUI((s) => s.closeNewsForm)
  const publish = useNews((s) => s.publish)
  const groups = useGroups((s) => s.groups)
  const groupsLoaded = useGroups((s) => s.loaded)
  const loadGroups = useGroups((s) => s.load)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<NewsAudience>('general')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && !groupsLoaded) void loadGroups()
  }, [open, groupsLoaded, loadGroups])

  useEffect(() => {
    if (open) {
      setTitle('')
      setBody('')
      setAudience('general')
      setGroupId(null)
    }
  }, [open])

  const canSave = title.trim() && body.trim() && (audience === 'general' || !!groupId)

  const submit = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await publish({
        title: title.trim(),
        body: body.trim(),
        audience,
        groupId: audience === 'group' ? groupId : null,
      })
      close()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Publicar noticia">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Título</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la noticia"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Contenido</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Escribe la noticia…"
            className={`${field} resize-none`}
          />
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Audiencia</span>
          <div className="flex gap-2">
            <AudienceButton active={audience === 'general'} onClick={() => setAudience('general')}>
              General
            </AudienceButton>
            <AudienceButton active={audience === 'group'} onClick={() => setAudience('group')}>
              Por grupo
            </AudienceButton>
          </div>
        </div>

        {audience === 'group' && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Grupo</span>
            <select
              value={groupId ?? ''}
              onChange={(e) => setGroupId(e.target.value || null)}
              className={`${field} appearance-none`}
            >
              <option value="">Selecciona un grupo…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groups.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-400/80">
                No hay grupos todavía. Créalos en “Grupos y usuarios”.
              </p>
            )}
          </label>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={close}
          className="rounded-xl px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!canSave || saving}
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </Modal>
  )
}

function AudienceButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
        active
          ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
      }`}
    >
      {children}
    </button>
  )
}
