import { create } from 'zustand'
import { api } from '../lib/api'

type Status = 'checking' | 'anon' | 'authed'

interface AuthStore {
  status: Status
  error: string | null
  submitting: boolean
  check: () => Promise<void>
  login: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuth = create<AuthStore>((set) => ({
  status: 'checking',
  error: null,
  submitting: false,

  check: async () => {
    try {
      const { authenticated } = await api.session()
      set({ status: authenticated ? 'authed' : 'anon' })
    } catch {
      set({ status: 'anon' })
    }
  },

  login: async (password) => {
    set({ submitting: true, error: null })
    try {
      await api.login(password)
      set({ status: 'authed', submitting: false })
      return true
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'No se pudo iniciar sesión',
        submitting: false,
      })
      return false
    }
  },

  logout: async () => {
    try {
      await api.logout()
    } catch {
      /* ignore — we clear the session locally regardless */
    }
    set({ status: 'anon' })
  },
}))
