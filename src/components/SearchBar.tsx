import { Search, Plus } from 'reicon-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { isProbablyUrl } from '../lib/url'

export function SearchBar() {
  const query = useStore((s) => s.query)
  const setQuery = useStore((s) => s.setQuery)
  const openAddLink = useUI((s) => s.openAddLink)

  const looksLikeUrl = isProbablyUrl(query)

  const save = () => {
    openAddLink(query.trim())
    setQuery('')
  }

  return (
    <div className="group relative">
      <Search
        size={20}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-slate-300"
      />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && looksLikeUrl) save()
        }}
        placeholder="Buscar o pegar un enlace para guardarlo…"
        className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-32 text-[15px] text-slate-100 placeholder:text-slate-500 outline-none backdrop-blur-md transition focus:border-white/20 focus:bg-white/[0.07]"
      />
      {looksLikeUrl && (
        <button
          onClick={save}
          className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-xl bg-emerald-500/90 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          <Plus size={16} />
          Guardar
        </button>
      )}
    </div>
  )
}
