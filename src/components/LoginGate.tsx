import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'reicon-react'
import { useAuth } from '../store/useAuth'

export function LoginGate() {
  const login = useAuth((s) => s.login)
  const error = useAuth((s) => s.error)
  const submitting = useAuth((s) => s.submitting)

  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) void login(password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-md"
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <LockKeyhole size={24} />
          </div>
          <h1 className="mt-4 text-xl font-medium text-slate-100">LinkBoard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Introduce la contraseña para acceder.
          </p>
        </div>

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="Contraseña"
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
          className="mt-4 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
