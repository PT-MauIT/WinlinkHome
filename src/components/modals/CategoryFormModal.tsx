import { useState } from 'react'
import { Check, Pen, Plus, Trash } from 'reicon-react'
import { Modal } from '../ui/Modal'
import { useStore } from '../../store/useStore'
import { useUI } from '../../store/useUI'
import { PALETTE, PALETTE_KEYS, colorOf } from '../../lib/colors'
import type { PaletteKey } from '../../types'

const field =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-white/25'

export function CategoryFormModal() {
  const open = useUI((s) => s.categoryModalOpen)
  const close = useUI((s) => s.closeCategoryModal)

  const categories = useStore((s) => s.categories)
  const addCategory = useStore((s) => s.addCategory)
  const updateCategory = useStore((s) => s.updateCategory)
  const removeCategory = useStore((s) => s.removeCategory)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<PaletteKey>('blue')

  const reset = () => {
    setEditingId(null)
    setName('')
    setColor('blue')
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (editingId) updateCategory(editingId, { name: trimmed, color })
    else addCategory({ name: trimmed, color })
    reset()
  }

  const startEdit = (id: string, n: string, c: PaletteKey) => {
    setEditingId(id)
    setName(n)
    setColor(c)
  }

  return (
    <Modal open={open} onClose={close} title="Categorías">
      {/* existing categories */}
      {categories.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorOf(c.color) }}
              />
              <span className="flex-1 truncate text-sm text-slate-200">{c.name}</span>
              <button
                onClick={() => startEdit(c.id, c.name, c.color)}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                title="Editar"
              >
                <Pen size={14} />
              </button>
              <button
                onClick={() => {
                  removeCategory(c.id)
                  if (editingId === c.id) reset()
                }}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
                title="Eliminar"
              >
                <Trash size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* form */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
        <p className="text-xs font-medium text-slate-400">
          {editingId ? 'Editar categoría' : 'Nueva categoría'}
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Nombre de la categoría"
          className={field}
        />

        <div className="flex flex-wrap gap-2">
          {PALETTE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setColor(key)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition"
              style={{
                backgroundColor: PALETTE[key],
                outline: color === key ? '2px solid white' : 'none',
                outlineOffset: 2,
              }}
              title={key}
            >
              {color === key && <Check size={16} color="#0c0e13" />}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {editingId && (
            <button
              onClick={reset}
              className="rounded-xl px-3.5 py-2 text-sm text-slate-300 transition hover:bg-white/5"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editingId ? <Check size={16} /> : <Plus size={16} />}
            {editingId ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
