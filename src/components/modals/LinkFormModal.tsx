import { useEffect, useMemo, useState } from 'react'
import { Trash } from 'reicon-react'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { useStore } from '../../store/useStore'
import { useUI } from '../../store/useUI'
import { useGroups } from '../../store/useGroups'
import { useAuth } from '../../store/useAuth'
import { deriveTitle, faviconSources, getDomain, initials, normalizeUrl } from '../../lib/url'
import { colorOf, tintOf } from '../../lib/colors'
import type { LinkItem } from '../../types'

const field =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-white/25'

export function LinkFormModal() {
  const linkModal = useUI((s) => s.linkModal)
  const closeLinkModal = useUI((s) => s.closeLinkModal)

  const categories = useStore((s) => s.categories)
  const links = useStore((s) => s.links)
  const groupLinks = useStore((s) => s.groupLinks)
  const favorites = useStore((s) => s.favorites)
  const activeCategoryId = useStore((s) => s.activeCategoryId)
  const addLink = useStore((s) => s.addLink)
  const updateLink = useStore((s) => s.updateLink)
  const removeLink = useStore((s) => s.removeLink)
  const addFavorite = useStore((s) => s.addFavorite)
  const updateFavorite = useStore((s) => s.updateFavorite)
  const removeFavorite = useStore((s) => s.removeFavorite)

  const isWorkspace = linkModal.kind === 'workspace'
  const workspacePool = useMemo(() => {
    const byId = new Map<string, LinkItem>()
    for (const l of links) byId.set(l.id, l)
    for (const gl of groupLinks) for (const l of gl.links) byId.set(l.id, l)
    return [...byId.values()]
  }, [links, groupLinks])
  const collection = isWorkspace ? workspacePool : favorites
  const add = isWorkspace ? addLink : addFavorite
  const update = isWorkspace ? updateLink : updateFavorite
  const remove = isWorkspace ? removeLink : removeFavorite

  const editing = linkModal.editId
    ? collection.find((l) => l.id === linkModal.editId) ?? null
    : null

  const groups = useGroups((s) => s.groups)
  const groupsLoaded = useGroups((s) => s.loaded)
  const loadGroups = useGroups((s) => s.load)
  const isAdmin = useAuth((s) => s.user?.role === 'admin')

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [touchedTitle, setTouchedTitle] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [groupIds, setGroupIds] = useState<string[]>([])

  useEffect(() => {
    if (linkModal.open && isWorkspace && isAdmin && !groupsLoaded) void loadGroups()
  }, [linkModal.open, isWorkspace, isAdmin, groupsLoaded, loadGroups])

  useEffect(() => {
    if (!linkModal.open) return
    setImgFailed(false)
    if (editing) {
      setUrl(editing.url)
      setTitle(editing.title)
      setCategoryId(editing.categoryId)
      setTouchedTitle(true)
      setGroupIds(editing.groupIds ?? [])
    } else {
      setUrl(linkModal.prefillUrl)
      setTitle(linkModal.prefillUrl ? deriveTitle(linkModal.prefillUrl) : '')
      setCategoryId(activeCategoryId)
      setTouchedTitle(false)
      setGroupIds(linkModal.presetGroupIds ?? [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkModal.open, linkModal.editId, linkModal.prefillUrl])

  const onUrlChange = (v: string) => {
    setUrl(v)
    setImgFailed(false)
    if (!touchedTitle) setTitle(v.trim() ? deriveTitle(v) : '')
  }

  const canSave = url.trim().length > 0
  const category = categories.find((c) => c.id === categoryId)

  const submit = () => {
    if (!canSave) return
    const payload = {
      title: title.trim() || deriveTitle(url),
      url: normalizeUrl(url),
      categoryId,
      ...(isWorkspace ? { groupIds } : {}),
    }
    if (editing) update(editing.id, payload)
    else add(payload)
    closeLinkModal()
  }

  const noun = isWorkspace ? 'herramienta' : 'favorito'

  return (
    <Modal
      open={linkModal.open}
      onClose={closeLinkModal}
      title={editing ? `Editar ${noun}` : `Nuevo ${noun}`}
    >
      {/* live preview */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold"
          style={{
            backgroundColor: tintOf(category?.color, 0.18),
            color: colorOf(category?.color),
          }}
        >
          {url.trim() && !imgFailed ? (
            <img
              src={faviconSources(url)[0]}
              alt=""
              className="h-6 w-6"
              onError={() => setImgFailed(true)}
            />
          ) : (
            initials(title || 'Enlace')
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-100">
            {title || 'Título del enlace'}
          </p>
          <p className="truncate text-xs text-slate-500">
            {url.trim() ? getDomain(url) : 'ejemplo.com'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">URL</span>
          <input
            autoFocus
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="https://ejemplo.com"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Título</span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setTouchedTitle(true)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Mi enlace"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Categoría</span>
          <Select
            value={categoryId ?? ''}
            onChange={(v) => setCategoryId(v || null)}
            placeholder="Sin categoría"
            options={[
              { value: '', label: 'Sin categoría' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </label>

        {isWorkspace && isAdmin && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Grupos</span>
            <div className="flex flex-wrap gap-1.5">
              {groups.length === 0 && (
                <span className="text-xs text-slate-500">
                  No hay grupos. Créalos en “Grupos y usuarios”.
                </span>
              )}
              {groups.map((g) => {
                const on = groupIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setGroupIds((cur) => (on ? cur.filter((x) => x !== g.id) : [...cur, g.id]))
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      on
                        ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    {g.name}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Sin grupos = visible para todos.</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {editing ? (
          <button
            onClick={() => {
              remove(editing.id)
              closeLinkModal()
            }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
          >
            <Trash size={16} />
            Eliminar
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            onClick={closeLinkModal}
            className="rounded-xl px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!canSave}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editing ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
