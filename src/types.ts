export type PaletteKey =
  | 'blue'
  | 'purple'
  | 'orange'
  | 'green'
  | 'pink'
  | 'cyan'
  | 'red'
  | 'amber'

export interface Category {
  id: string
  name: string
  color: PaletteKey
}

export interface LinkItem {
  id: string
  title: string
  url: string
  categoryId: string | null
  createdAt: number
  groupIds?: string[]
}

export type Role = 'admin' | 'member'

export interface Group {
  id: string
  name: string
  slug: string
}

export interface GroupLinks {
  group: Group
  links: LinkItem[]
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  groups: Group[]
}

/** A user as seen by an admin in the groups panel (includes group membership). */
export interface UserSummary {
  id: string
  email: string
  name: string
  role: Role
  groups: Group[]
}

export type NewsAudience = 'general' | 'group'

export interface NewsItem {
  id: string
  title: string
  body: string
  audience: NewsAudience
  groupId: string | null
  groupName: string | null
  authorName: string | null
  createdAt: number
}

export type BackgroundSource = 'default' | 'unsplash' | 'admin' | 'collaborator'

export interface Background {
  source: BackgroundSource
  url: string | null
  credit: string | null
}

export interface UnsplashPhoto {
  id: string
  thumb: string
  full: string
  credit: string
  downloadLocation: string | null
}
