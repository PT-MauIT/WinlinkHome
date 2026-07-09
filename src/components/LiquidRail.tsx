import { Home6, DirectNotification2 } from 'reicon-react'

/** Liquid-glass navigation rail pinned to the left edge, vertically centered.
 *  Grows downward as items are added. Top item is the Parque Tempisque logo,
 *  followed by the nav buttons. Each button reveals a liquid-glass label that
 *  deploys to the right on hover. Add further buttons below News. */
export function LiquidRail() {
  const goHome = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <nav
      aria-label="Navegación"
      className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 sm:block"
    >
      <div className="relative flex flex-col items-center gap-2 rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.13] to-white/[0.04] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        {/* top sheen — sells the "liquid glass" surface */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[26px] bg-gradient-to-b from-white/15 to-transparent opacity-70" />

        {/* logo: Parque Tempisque */}
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] shadow-inner shadow-white/10">
          <img
            src="/Logo/Logo_blanco.png"
            alt="Parque Tempisque"
            className="h-7 w-7 object-contain"
            draggable={false}
          />
        </div>

        <div className="my-0.5 h-px w-7 bg-white/10" />

        {/* Home → pantalla principal (activo: es la vista actual) */}
        <RailButton label="Inicio" icon={Home6} active onClick={goHome} />

        {/* Noticias */}
        <RailButton
          label="Noticias"
          icon={DirectNotification2}
          onClick={() => {}}
        />

        {/* next rail items go here */}
      </div>
    </nav>
  )
}

interface RailButtonProps {
  label: string
  icon: React.ComponentType<{ size?: number }>
  active?: boolean
  onClick: () => void
}

function RailButton({ label, icon: Icon, active = false, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
        active
          ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
          : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      {/* active accent bar on the outer (screen) edge */}
      {active && (
        <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-emerald-300" />
      )}

      <Icon size={19} />

      {/* hover label — deploys to the right with the liquid-glass surface */}
      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 pl-3">
        <span className="block -translate-x-1.5 whitespace-nowrap rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.14] to-white/[0.05] px-3 py-1.5 text-sm font-medium text-slate-100 opacity-0 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
          {label}
        </span>
      </span>
    </button>
  )
}
