import { useRef, useState } from 'react'
import { ImageSparkle, ImageMountain, Upload, Search, Loader, Check } from 'reicon-react'
import { useStore } from '../../store/useStore'
import { api, ApiError } from '../../lib/api'
import { ADMIN_IMAGES } from '../../data/backgrounds'
import type { BackgroundSource, UnsplashPhoto } from '../../types'

type Tab = 'unsplash' | 'admin' | 'collaborator'

const TABS: { id: Tab; label: string; icon: typeof ImageSparkle }[] = [
  { id: 'unsplash', label: 'Unsplash', icon: ImageSparkle },
  { id: 'admin', label: 'Precargada', icon: ImageMountain },
  { id: 'collaborator', label: 'Subir', icon: Upload },
]

const thumb =
  'group relative aspect-video overflow-hidden rounded-lg border border-white/10 transition hover:border-emerald-400/60'

export function ImageSourcePanel() {
  const background = useStore((s) => s.background)
  const setBackground = useStore((s) => s.setBackground)
  const [tab, setTab] = useState<Tab>('admin')

  const isActive = (source: BackgroundSource, url: string) =>
    background.source === source && background.url === url

  return (
    <div className="space-y-3">
      {/* segmented tabs */}
      <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              tab === id
                ? 'bg-white/10 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'unsplash' && <UnsplashTab isActive={isActive} onPick={setBackground} />}
      {tab === 'admin' && <AdminTab isActive={isActive} onPick={setBackground} />}
      {tab === 'collaborator' && <UploadTab isActive={isActive} onPick={setBackground} />}

      {/* reset to the default mountain scene */}
      {background.source !== 'default' && (
        <button
          onClick={() => setBackground({ source: 'default', url: null, credit: null })}
          className="w-full rounded-lg border border-white/10 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
        >
          Restaurar fondo por defecto
        </button>
      )}
    </div>
  )
}

interface TabProps {
  isActive: (source: BackgroundSource, url: string) => boolean
  onPick: (data: { source: BackgroundSource; url: string; credit: string | null }) => void
}

function ActiveTick() {
  return (
    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
      <Check size={12} />
    </span>
  )
}

// ---- Precargada por admin --------------------------------------------------

function AdminTab({ isActive, onPick }: TabProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ADMIN_IMAGES.map((img) => (
        <button
          key={img.id}
          onClick={() => onPick({ source: 'admin', url: img.url, credit: null })}
          className={thumb}
          title={img.label}
        >
          <AdminThumb url={img.url} label={img.label} />
          {isActive('admin', img.url) && <ActiveTick />}
        </button>
      ))}
    </div>
  )
}

function AdminThumb({ url, label }: { url: string; label: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-white/[0.03] px-2 text-center text-[10px] leading-tight text-slate-500">
        {label}
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={label}
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

// ---- Unsplash --------------------------------------------------------------

function UnsplashTab({ isActive, onPick }: TabProps) {
  const [query, setQuery] = useState('guanacaste')
  const [results, setResults] = useState<UnsplashPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    setLoading(true)
    setError(null)
    try {
      const { results } = await api.searchUnsplash(query.trim() || 'nature')
      setResults(results)
      if (results.length === 0) setError('Sin resultados.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo consultar Unsplash')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const pick = (p: UnsplashPhoto) => {
    onPick({ source: 'unsplash', url: p.full, credit: p.credit })
    void api.trackUnsplash(p.downloadLocation).catch(() => {})
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Buscar en Unsplash…"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-white/25"
        />
        <button
          onClick={search}
          disabled={loading}
          className="flex items-center justify-center rounded-lg bg-white/10 px-2.5 text-slate-200 transition hover:bg-white/15 disabled:opacity-50"
          aria-label="Buscar"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
        </button>
      </div>

      {error && <p className="text-xs text-amber-400/90">{error}</p>}

      {results.length > 0 && (
        <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-0.5">
          {results.map((p) => (
            <button key={p.id} onClick={() => pick(p)} className={thumb} title={p.credit}>
              <img src={p.thumb} alt="" className="h-full w-full object-cover" />
              {isActive('unsplash', p.full) && <ActiveTick />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Subida por colaborador ------------------------------------------------

function UploadTab({ isActive, onPick }: TabProps) {
  const background = useStore((s) => s.background)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const { url } = await api.uploadBackground(file)
      onPick({ source: 'collaborator', url, credit: null })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const showingUpload = isActive('collaborator', background.url ?? '')

  return (
    <div className="space-y-2">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] py-5 text-slate-400 transition hover:border-emerald-400/50 hover:text-slate-200 disabled:opacity-60"
      >
        {uploading ? (
          <Loader size={18} className="animate-spin" />
        ) : (
          <Upload size={18} />
        )}
        <span className="text-xs">
          {uploading ? 'Subiendo…' : 'Elegir imagen (JPG, PNG, WEBP)'}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {error && <p className="text-xs text-amber-400/90">{error}</p>}

      {showingUpload && background.url && (
        <div className={`${thumb} pointer-events-none`}>
          <img src={background.url} alt="" className="h-full w-full object-cover" />
          <ActiveTick />
        </div>
      )}
    </div>
  )
}
