import { create } from 'zustand'
import type { NewsAudience, NewsItem } from '../types'
import { api } from '../lib/api'

type PublishInput = {
  title: string
  body: string
  audience: NewsAudience
  groupId: string | null
}

interface NewsStore {
  items: NewsItem[]
  loaded: boolean
  load: () => Promise<void>
  publish: (data: PublishInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useNews = create<NewsStore>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    const items = await api.listNews()
    set({ items, loaded: true })
  },

  publish: async (data) => {
    const item = await api.addNews(data)
    set((s) => ({ items: [item, ...s.items] }))
  },

  remove: async (id) => {
    const prev = get().items
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
    try {
      await api.removeNews(id)
    } catch (e) {
      console.error(e)
      set({ items: prev })
    }
  },
}))
