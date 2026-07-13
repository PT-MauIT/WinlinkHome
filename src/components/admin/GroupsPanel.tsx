import { useEffect, useState } from 'react'
import { Plus, Trash } from 'reicon-react'
import { Modal } from '../ui/Modal'
import { useUI } from '../../store/useUI'
import { useGroups } from '../../store/useGroups'

export function GroupsPanel() {
  const open = useUI((s) => s.groupsPanelOpen)
  const close = useUI((s) => s.closeGroupsPanel)
  const groups = useGroups((s) => s.groups)
  const users = useGroups((s) => s.users)
  const load = useGroups((s) => s.load)
  const addGroup = useGroups((s) => s.addGroup)
  const removeGroup = useGroups((s) => s.removeGroup)
  const setUserGroups = useGroups((s) => s.setUserGroups)
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const add = async () => {
    const n = name.trim()
    if (!n) return
    setName('')
    await addGroup(n)
  }

  const toggle = (userId: string, current: string[], gid: string) => {
    const next = current.includes(gid) ? current.filter((x) => x !== gid) : [...current, gid]
    void setUserGroups(userId, next)
  }

  return (
    <Modal open={open} onClose={close} title="Grupos y usuarios">
      {/* groups */}
      <section className="mb-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Grupos
        </h3>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {groups.length === 0 && <span className="text-sm text-slate-500">Aún no hay grupos.</span>}
          {groups.map((g) => (
            <span
              key={g.id}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] py-1 pl-3 pr-1.5 text-sm text-slate-200"
            >
              {g.name}
              <button
                onClick={() => removeGroup(g.id)}
                className="rounded-full p-0.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-300"
                title="Eliminar grupo"
              >
                <Trash size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Nuevo grupo"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-white/25"
          />
          <button
            onClick={add}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/15 disabled:opacity-40"
          >
            <Plus size={15} />
            Crear
          </button>
        </div>
      </section>

      {/* users */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Usuarios
        </h3>
        <div className="max-h-[38vh] space-y-2.5 overflow-y-auto pr-1">
          {users.map((u) => {
            const current = u.groups.map((g) => g.id)
            return (
              <div key={u.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{u.name}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                      u.role === 'admin'
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : 'bg-white/[0.06] text-slate-400'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                {groups.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {groups.map((g) => {
                      const on = current.includes(g.id)
                      return (
                        <button
                          key={g.id}
                          onClick={() => toggle(u.id, current, g.id)}
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
                )}
              </div>
            )
          })}
        </div>
      </section>
    </Modal>
  )
}
