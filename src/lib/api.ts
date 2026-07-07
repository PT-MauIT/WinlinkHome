import type { Category, LinkItem, PaletteKey } from '../types'

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

export const api = {
  session: () => req<{ authenticated: boolean }>('/session'),
  login: (password: string) =>
    req<{ ok: true }>('/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => req<{ ok: true }>('/logout', { method: 'POST' }),

  getState: () =>
    req<{ userName: string; categories: Category[]; links: LinkItem[] }>('/state'),
  setName: (name: string) =>
    req<{ userName: string }>('/settings/name', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  addLink: (data: LinkInput) =>
    req<LinkItem>('/links', { method: 'POST', body: JSON.stringify(data) }),
  updateLink: (id: string, data: Partial<LinkInput>) =>
    req<LinkItem>(`/links/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeLink: (id: string) =>
    req<{ ok: true }>(`/links/${id}`, { method: 'DELETE' }),

  addCategory: (data: CategoryInput) =>
    req<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<CategoryInput>) =>
    req<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeCategory: (id: string) =>
    req<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' }),
}
