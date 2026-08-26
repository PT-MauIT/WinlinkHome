import { create } from 'zustand'
import type { Background, Category, GroupLinks, LinkItem, PaletteKey } from '../types'
import { api } from '../lib/api'

const DEFAULT_BACKGROUND: Background = { source: 'default', url: null, credit: null }

export type BoardView = 'all' | 'workspace' | 'favorites'

type LinkInput = { title: string; url: string; categoryId: string | null }
type CategoryInput = { name: string; color: PaletteKey }

interface Store {
  categories: Category[]
  links: LinkItem[] // workspace (admin-managed)
  groupLinks: GroupLinks[]
  favorites: LinkItem[] // per-user
  activeCategoryId: string | null
  activeDept: string | null
  query: string
  view: BoardView
  loaded: boolean
  background: Background

  load: () => Promise<void>
  setActiveCategory: (id: string | null) => void
  setActiveDept: (id: string | null) => void
  setQuery: (q: string) => void
  setView: (v: BoardView) => void
  setBackground: (data: Background) => Promise<void>

  // workspace links (admin)
  addLink: (data: LinkInput) => Promise<void>
  updateLink: (id: string, data: Partial<LinkInput>) => Promise<void>
  removeLink: (id: string) => Promise<void>

  // favorites (user)
  addFavorite: (data: LinkInput) => Promise<void>
  updateFavorite: (id: string, data: Partial<LinkInput>) => Promise<void>
  removeFavorite: (id: string) => Promise<void>

  // categories (admin)
  addCategory: (data: CategoryInput) => Promise<void>
  updateCategory: (id: string, data: Partial<CategoryInput>) => Promise<void>
  removeCategory: (id: string) => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  categories: [],
  links: [],
  groupLinks: [],
  favorites: [],
  activeCategoryId: null,
  activeDept: null,
  query: '',
  view: 'all',
  loaded: false,
  background: DEFAULT_BACKGROUND,

  load: async () => {
    const state = await api.getState()
    set({
      categories: state.categories,
      links: state.links,
      groupLinks: state.groupLinks ?? [],
      favorites: state.favorites,
      background: state.background ?? DEFAULT_BACKGROUND,
      loaded: true,
    })
  },

  setActiveCategory: (id) => set({ activeCategoryId: id }),
  setActiveDept: (id) => set({ activeDept: id }),
  setQuery: (q) => set({ query: q }),
  setView: (v) => set({ view: v }),

  // optimistic — the picker feels instant; revert to server truth on failure
  setBackground: async (data) => {
    const prev = get().background
    set({ background: data })
    try {
      const saved = await api.setBackground(data)
      set({ background: saved })
    } catch (e) {
      console.error(e)
      set({ background: prev })
    }
  },

  // ---- workspace links (admin) ----
  addLink: async (data) => {
    try {
      await api.addLink(data)
      await get().load()
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },
  updateLink: async (id, data) => {
    try {
      await api.updateLink(id, data)
      await get().load()
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },
  removeLink: async (id) => {
    try {
      await api.removeLink(id)
      await get().load()
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },

  // ---- favorites (user) ----
  addFavorite: async (data) => {
    try {
      const fav = await api.addFavorite(data)
      set((s) => ({ favorites: [...s.favorites, fav] }))
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },
  updateFavorite: async (id, data) => {
    const prev = get().favorites
    set((s) => ({ favorites: s.favorites.map((l) => (l.id === id ? { ...l, ...data } : l)) }))
    try {
      await api.updateFavorite(id, data)
    } catch (e) {
      console.error(e)
      set({ favorites: prev })
    }
  },
  removeFavorite: async (id) => {
    const prev = get().favorites
    set((s) => ({ favorites: s.favorites.filter((l) => l.id !== id) }))
    try {
      await api.removeFavorite(id)
    } catch (e) {
      console.error(e)
      set({ favorites: prev })
    }
  },

  // ---- categories (admin) ----
  addCategory: async (data) => {
    try {
      const category = await api.addCategory(data)
      set((s) => ({ categories: [...s.categories, category] }))
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },
  updateCategory: async (id, data) => {
    const prev = get().categories
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
    try {
      await api.updateCategory(id, data)
    } catch (e) {
      console.error(e)
      set({ categories: prev })
    }
  },
  removeCategory: async (id) => {
    const prevCategories = get().categories
    const prevLinks = get().links
    const prevFavorites = get().favorites
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      links: s.links.map((l) => (l.categoryId === id ? { ...l, categoryId: null } : l)),
      favorites: s.favorites.map((l) => (l.categoryId === id ? { ...l, categoryId: null } : l)),
      activeCategoryId: s.activeCategoryId === id ? null : s.activeCategoryId,
    }))
    try {
      await api.removeCategory(id)
    } catch (e) {
      console.error(e)
      set({ categories: prevCategories, links: prevLinks, favorites: prevFavorites })
    }
  },
}))
