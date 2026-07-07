import { create } from 'zustand'
import type { Background, Category, LinkItem, PaletteKey } from '../types'
import { api } from '../lib/api'

const DEFAULT_BACKGROUND: Background = { source: 'default', url: null, credit: null }

type LinkInput = { title: string; url: string; categoryId: string | null }
type CategoryInput = { name: string; color: PaletteKey }

interface Store {
  userName: string
  categories: Category[]
  links: LinkItem[]
  activeCategoryId: string | null
  query: string
  loaded: boolean
  background: Background

  load: () => Promise<void>
  setUserName: (name: string) => void
  setActiveCategory: (id: string | null) => void
  setQuery: (q: string) => void
  setBackground: (data: Background) => Promise<void>

  addLink: (data: LinkInput) => Promise<void>
  updateLink: (id: string, data: Partial<LinkInput>) => Promise<void>
  removeLink: (id: string) => Promise<void>

  addCategory: (data: CategoryInput) => Promise<void>
  updateCategory: (id: string, data: Partial<CategoryInput>) => Promise<void>
  removeCategory: (id: string) => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  userName: 'amigo',
  categories: [],
  links: [],
  activeCategoryId: null,
  query: '',
  loaded: false,
  background: DEFAULT_BACKGROUND,

  load: async () => {
    const state = await api.getState()
    set({
      userName: state.userName,
      categories: state.categories,
      links: state.links,
      background: state.background ?? DEFAULT_BACKGROUND,
      loaded: true,
    })
  },

  setActiveCategory: (id) => set({ activeCategoryId: id }),
  setQuery: (q) => set({ query: q }),

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

  setUserName: (name) => {
    const clean = name.trim() || 'amigo'
    set({ userName: clean })
    api.setName(clean).catch((e) => {
      console.error(e)
      void get().load()
    })
  },

  // creates go server-first (we need the generated id back)
  addLink: async (data) => {
    try {
      const link = await api.addLink(data)
      set((s) => ({ links: [...s.links, link] }))
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },

  addCategory: async (data) => {
    try {
      const category = await api.addCategory(data)
      set((s) => ({ categories: [...s.categories, category] }))
    } catch (e) {
      console.error(e)
      void get().load()
    }
  },

  // updates & deletes are optimistic, reverting on failure
  updateLink: async (id, data) => {
    const prev = get().links
    set((s) => ({ links: s.links.map((l) => (l.id === id ? { ...l, ...data } : l)) }))
    try {
      await api.updateLink(id, data)
    } catch (e) {
      console.error(e)
      set({ links: prev })
    }
  },

  removeLink: async (id) => {
    const prev = get().links
    set((s) => ({ links: s.links.filter((l) => l.id !== id) }))
    try {
      await api.removeLink(id)
    } catch (e) {
      console.error(e)
      set({ links: prev })
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
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      links: s.links.map((l) => (l.categoryId === id ? { ...l, categoryId: null } : l)),
      activeCategoryId: s.activeCategoryId === id ? null : s.activeCategoryId,
    }))
    try {
      await api.removeCategory(id)
    } catch (e) {
      console.error(e)
      set({ categories: prevCategories, links: prevLinks })
    }
  },
}))
