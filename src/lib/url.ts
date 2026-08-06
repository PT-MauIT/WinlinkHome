/** Prepend https:// when the user omitted the protocol. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Heuristic: does this text look like a URL/domain the user wants to save? */
export function isProbablyUrl(input: string): boolean {
  const v = input.trim()
  if (!v || /\s/.test(v)) return false
  if (/^https?:\/\//i.test(v)) return true
  return /^[^\s]+\.[a-z]{2,}([/?#].*)?$/i.test(v)
}

/** Bare hostname without the leading www. */
export function getDomain(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0]
  }
}

/** Guess a human title from a URL, e.g. https://github.com -> "Github". */
export function deriveTitle(url: string): string {
  const domain = getDomain(url)
  const core = domain.split('.')[0] || domain
  return core.charAt(0).toUpperCase() + core.slice(1)
}

/** Fuentes de favicon en orden: se prueba cada una hasta que cargue; si todas
 *  fallan, el consumidor cae a iniciales.
 *  1) DuckDuckGo — iconos limpios, devuelve 404 real cuando no existe (dispara fallback).
 *  2) Google s2 en alta resolución — nítido a tamaños chicos, último recurso con imagen. */
export function faviconSources(url: string): string[] {
  const domain = getDomain(url)
  return [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ]
}

/** Fallback badge text when the favicon fails to load. */
export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
