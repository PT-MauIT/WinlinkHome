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
