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
