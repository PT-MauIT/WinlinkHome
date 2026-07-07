import type { PaletteKey } from '../types'

/** Category color palette — soft, "fresh" tones that read well on a dark bg. */
export const PALETTE: Record<PaletteKey, string> = {
  blue: '#6b8afd',
  purple: '#a78bfa',
  orange: '#f2955f',
  green: '#5fd39a',
  pink: '#f472b6',
  cyan: '#4dd0e1',
  red: '#f2777a',
  amber: '#fbbf24',
}

export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[]

export function colorOf(key: string | null | undefined): string {
  if (!key) return '#8a94a6'
  return PALETTE[key as PaletteKey] ?? '#8a94a6'
}

/** Semi-transparent tint of a palette color, for soft backgrounds. */
export function tintOf(key: string | null | undefined, alpha = 0.16): string {
  const hex = colorOf(key)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
