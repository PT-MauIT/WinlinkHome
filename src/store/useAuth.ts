import { create } from 'zustand'
import type { User } from '../types'
import { api } from '../lib/api'

type Status = 'checking' | 'anon' | 'authed'

interface AuthStore {
  status: Status
  user: User | null
  error: string | null
  submitting: boolean
  check: () => Promise<void>
  login: (password: string) => Promise<boolean>
  loginWithMicrosoft: () => void
  logout: () => Promise<void>
  setUser: (user: User) => void
  setName: (name: string) => void
}

export const useAuth = create<AuthStore>((set) => ({
  status: 'checking',
  user: null,
  error: null,
  submitting: false,

  check: async () => {
    try {
      const { user } = await api.session()
      set({ status: user ? 'authed' : 'anon', user })
    } catch {
      set({ status: 'anon', user: null })
    }
  },

  // Password fallback → logs in as the bootstrap admin.
  login: async (password) => {
    set({ submitting: true, error: null })
    try {
      const { user } = await api.login(password)
      set({ status: 'authed', user, submitting: false })
      return true
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'No se pudo iniciar sesión',
        submitting: false,
      })
      return false
    }
  },

  loginWithMicrosoft: () => {
    window.location.href = '/api/auth/login'
  },

  logout: async () => {
    try {
      await api.logout()
    } catch {
      /* ignore — we clear the session locally regardless */
    }
    set({ status: 'anon', user: null })
  },

  setUser: (user) => set({ user }),

  // optimistic display-name edit; persists to the server, reverts on failure
  setName: (name) => {
    const clean = name.trim()
    const prev = useAuth.getState().user
    if (!clean || !prev) return
    set({ user: { ...prev, name: clean } })
    api.setName(clean).catch((e) => {
      console.error(e)
      set({ user: prev })
    })
  },
}))
