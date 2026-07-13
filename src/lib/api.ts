import type {
  Background,
  Category,
  Group,
  LinkItem,
  NewsAudience,
  NewsItem,
  PaletteKey,
  UnsplashPhoto,
  User,
  UserSummary,
} from '../types'

const BASE = '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      /* ignore non-JSON bodies */
    }
    throw new ApiError(message, res.status)
  }
  return (await res.json()) as T
}

type LinkInput = { title: string; url: string; categoryId: string | null }
type CategoryInput = { name: string; color: PaletteKey }
type NewsInput = { title: string; body: string; audience: NewsAudience; groupId: string | null }

interface StatePayload {
  user: User
  categories: Category[]
  links: LinkItem[]
  favorites: LinkItem[]
  background: Background
}

export const api = {
  // ---- auth ----
  session: () => req<{ user: User | null }>('/session'),
  login: (password: string) =>
    req<{ user: User }>('/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => req<{ ok: true }>('/logout', { method: 'POST' }),

  // ---- state ----
  getState: () => req<StatePayload>('/state'),
  setName: (name: string) =>
    req<{ user: User }>('/settings/name', { method: 'PUT', body: JSON.stringify({ name }) }),

  setBackground: (data: Background) =>
    req<Background>('/settings/background', { method: 'PUT', body: JSON.stringify(data) }),

  // raw binary upload — bypasses the JSON body parser & base64 overhead
  uploadBackground: async (file: File): Promise<{ url: string }> => {
    const res = await fetch(`${BASE}/uploads/background?type=${encodeURIComponent(file.type)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    })
    if (!res.ok) {
      let message = `Error ${res.status}`
      try {
        const data = await res.json()
        if (data?.error) message = data.error
      } catch {
        /* ignore */
      }
      throw new ApiError(message, res.status)
    }
    return (await res.json()) as { url: string }
  },

  searchUnsplash: (query: string, page = 1) =>
    req<{ results: UnsplashPhoto[] }>(
      `/unsplash/search?query=${encodeURIComponent(query)}&page=${page}`,
    ),
  trackUnsplash: (downloadLocation: string | null) =>
    req<{ ok: true }>('/unsplash/track', {
      method: 'POST',
      body: JSON.stringify({ downloadLocation }),
    }),

  // ---- workspace links (admin) ----
  addLink: (data: LinkInput) =>
    req<LinkItem>('/links', { method: 'POST', body: JSON.stringify(data) }),
  updateLink: (id: string, data: Partial<LinkInput>) =>
    req<LinkItem>(`/links/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeLink: (id: string) => req<{ ok: true }>(`/links/${id}`, { method: 'DELETE' }),

  // ---- favorites (per-user) ----
  addFavorite: (data: LinkInput) =>
    req<LinkItem>('/favorites', { method: 'POST', body: JSON.stringify(data) }),
  updateFavorite: (id: string, data: Partial<LinkInput>) =>
    req<LinkItem>(`/favorites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeFavorite: (id: string) => req<{ ok: true }>(`/favorites/${id}`, { method: 'DELETE' }),

  // ---- categories (admin) ----
  addCategory: (data: CategoryInput) =>
    req<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<CategoryInput>) =>
    req<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeCategory: (id: string) => req<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' }),

  // ---- news ----
  listNews: () => req<NewsItem[]>('/news'),
  addNews: (data: NewsInput) =>
    req<NewsItem>('/news', { method: 'POST', body: JSON.stringify(data) }),
  removeNews: (id: string) => req<{ ok: true }>(`/news/${id}`, { method: 'DELETE' }),

  // ---- groups & users (admin) ----
  listGroups: () => req<Group[]>('/groups'),
  addGroup: (name: string) =>
    req<Group>('/groups', { method: 'POST', body: JSON.stringify({ name }) }),
  removeGroup: (id: string) => req<{ ok: true }>(`/groups/${id}`, { method: 'DELETE' }),
  listUsers: () => req<UserSummary[]>('/users'),
  setUserGroups: (userId: string, groupIds: string[]) =>
    req<{ ok: true }>(`/users/${userId}/groups`, {
      method: 'PUT',
      body: JSON.stringify({ groupIds }),
    }),
}
