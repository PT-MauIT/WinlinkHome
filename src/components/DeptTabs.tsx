import type { Group } from '../types'

interface DeptTabsProps {
  groups: Group[]
  activeId: string | null
  onSelect: (id: string) => void
}

/** Fila de tags de departamento, al estilo de los chips de CategoryFilter. */
export function DeptTabs({ groups, activeId, onSelect }: DeptTabsProps) {
  if (groups.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => {
        const active = g.id === activeId
        return (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              active
                ? 'border-white/25 bg-white/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
            }`}
          >
            {g.name}
          </button>
        )
      })}
    </div>
  )
}
