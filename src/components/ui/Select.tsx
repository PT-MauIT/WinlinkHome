import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'reicon-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

const control =
  'flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-white/25 disabled:opacity-40'

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  disabled,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    if (open) {
      const i = options.findIndex((o) => o.value === value)
      setActive(i < 0 ? 0 : i)
    }
  }, [open, value, options])

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        e.stopPropagation() // no cerrar el Modal, solo el dropdown
        setOpen(false)
      }
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open && options[active]) choose(options[active].value)
      else setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setActive((a) => Math.min(a + 1, options.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} onKeyDown={onKeyDown} className={control}>
        <span className={selected ? 'text-slate-100' : 'text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#14171e]/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-sm"
        >
          {options.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin opciones</li>}
          {options.map((o, i) => {
            const isSel = o.value === value
            const isActive = i === active
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                    isSel
                      ? 'bg-emerald-400/15 text-emerald-200'
                      : isActive
                        ? 'bg-white/[0.06] text-slate-100'
                        : 'text-slate-200'
                  }`}
                >
                  {o.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
