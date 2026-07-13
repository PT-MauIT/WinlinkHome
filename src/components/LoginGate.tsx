import { useState } from 'react'
import { Eye, EyeOff, ChevronDown } from 'reicon-react'
import { useAuth } from '../store/useAuth'

const OAUTH_ERRORS: Record<string, string> = {
  sso: 'No se pudo completar el inicio de sesión con Microsoft.',
  sso_state: 'La sesión de inicio expiró. Inténtalo de nuevo.',
  sso_init: 'No se pudo iniciar el login con Microsoft.',
}

export function LoginGate() {
  const login = useAuth((s) => s.login)
  const loginWithMicrosoft = useAuth((s) => s.loginWithMicrosoft)
  const error = useAuth((s) => s.error)
  const submitting = useAuth((s) => s.submitting)

  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  const urlError = new URLSearchParams(window.location.search).get('error')
  const oauthError = urlError ? OAUTH_ERRORS[urlError] ?? 'Ocurrió un error al iniciar sesión.' : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) void login(password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/Logo/Logo_blanco.png"
            alt="Parque Tempisque"
            className="h-14 w-14 object-contain"
            draggable={false}
          />
          <h1 className="mt-4 text-xl font-medium text-slate-100">Parque Tempisque</h1>
          <p className="mt-1 text-sm text-slate-400">Inicia sesión para acceder a tu home.</p>
        </div>

        {oauthError && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {oauthError}
          </p>
        )}

        {/* primary: Microsoft SSO */}
        <button
          onClick={loginWithMicrosoft}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/95 py-3 text-sm font-medium text-slate-800 transition hover:bg-white"
        >
          <MicrosoftLogo />
          Continuar con Microsoft
        </button>

        {/* fallback: shared password */}
        <button
          onClick={() => setShowFallback((v) => !v)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
        >
          Acceso con contraseña
          <ChevronDown size={13} className={`transition-transform ${showFallback ? 'rotate-180' : ''}`} />
        </button>

        {showFallback && (
          <form onSubmit={submit} className="mt-3">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Contraseña de administrador"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:text-slate-300"
                aria-label={show ? 'Ocultar' : 'Mostrar'}
                tabIndex={-1}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !password}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
