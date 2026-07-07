import { useState } from 'react'
import { Sunrise, Sun, Moon, Logout } from 'reicon-react'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useNow } from '../lib/useNow'
import { getGreeting, formatDate, formatTime } from '../lib/time'

const GREETING_ICON = { sunrise: Sunrise, sun: Sun, moon: Moon }

export function Header() {
  const now = useNow(1000)
  const userName = useStore((s) => s.userName)
  const setUserName = useStore((s) => s.setUserName)
  const logout = useAuth((s) => s.logout)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(userName)

  const greeting = getGreeting(now)
  const GreetingIcon = GREETING_ICON[greeting.icon]

  const commit = () => {
    setUserName(draft)
    setEditing(false)
  }

  return (
    <header className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-x-3 text-3xl font-light tracking-tight text-slate-100 sm:text-4xl">
          <GreetingIcon size={30} className="shrink-0 text-slate-400" />
          <span>
            {greeting.text},{' '}
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="w-40 border-b border-slate-500 bg-transparent font-normal text-white outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setDraft(userName)
                  setEditing(true)
                }}
                className="font-normal text-white underline-offset-4 transition hover:underline"
                title="Editar nombre"
              >
                {userName}
              </button>
            )}
          </span>
        </h1>
        <p className="mt-2 text-xs font-medium tracking-[0.2em] text-slate-500">
          {formatDate(now)}
        </p>
      </div>

      <div className="flex shrink-0 items-start gap-3 pt-1">
        <time className="text-4xl font-extralight tabular-nums tracking-tight text-slate-300 sm:text-5xl">
          {formatTime(now)}
        </time>
        <button
          onClick={() => void logout()}
          title="Cerrar sesión"
          className="mt-1 rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
        >
          <Logout size={18} />
        </button>
      </div>
    </header>
  )
}
