import { useEffect, useRef, useState } from 'react'
import { Gear, Image, ChevronDown } from 'reicon-react'
import { ImageSourcePanel } from './settings/ImageSourcePanel'

/** Floating gear in the bottom-right corner. Faint until hovered; opens a
 *  settings panel upward. First (and for now only) group: image source. */
export function SettingsFab() {
  const [open, setOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {/* panel — deploys upward from the gear */}
      {open && (
        <div className="mb-2 w-72 origin-bottom-right rounded-2xl border border-white/10 bg-[#14171e]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md">
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Ajustes
          </p>

          {/* group: image source (accordion) */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <button
              onClick={() => setImageOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
            >
              <Image size={16} className="text-slate-400" />
              <span className="flex-1 text-left">Origen de imagen</span>
              <ChevronDown
                size={15}
                className={`text-slate-500 transition-transform ${imageOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {imageOpen && (
              <div className="border-t border-white/[0.07] p-3">
                <ImageSourcePanel />
              </div>
            )}
          </div>
        </div>
      )}

      {/* the gear button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Ajustes"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#14171e]/80 text-slate-300 shadow-lg shadow-black/30 backdrop-blur-md transition-all duration-200 hover:bg-[#1b1f28] hover:text-white ${
          open ? 'rotate-90 opacity-100' : 'opacity-40 hover:opacity-100'
        }`}
      >
        <Gear size={17} />
      </button>
    </div>
  )
}
