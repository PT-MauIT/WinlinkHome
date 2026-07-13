import { Plus } from 'reicon-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useAuth } from '../store/useAuth'
import { colorOf } from '../lib/colors'

export function CategoryFilter() {
  const categories = useStore((s) => s.categories)
  const activeCategoryId = useStore((s) => s.activeCategoryId)
  const setActiveCategory = useStore((s) => s.setActiveCategory)
  const openCategoryModal = useUI((s) => s.openCategoryModal)
  const isAdmin = useAuth((s) => s.user?.role === 'admin')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        label="Todos"
        active={activeCategoryId === null}
        onClick={() => setActiveCategory(null)}
      />

      {categories.map((c) => (
        <Chip
          key={c.id}
          label={c.name}
          color={colorOf(c.color)}
          active={activeCategoryId === c.id}
          onClick={() => setActiveCategory(c.id)}
        />
      ))}

      {isAdmin && (
        <button
          onClick={openCategoryModal}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-white/20 px-3.5 py-1.5 text-sm text-slate-400 transition hover:border-white/40 hover:text-slate-200"
        >
          <Plus size={15} />
          Agregar
        </button>
      )}
    </div>
  )
}

interface ChipProps {
  label: string
  active: boolean
  color?: string
  onClick: () => void
}

function Chip({ label, active, color, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? 'border-white/25 bg-white/10 text-white'
          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
      }`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  )
}
