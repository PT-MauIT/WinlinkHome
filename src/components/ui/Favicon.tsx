import { useEffect, useState } from 'react'
import { faviconSources, initials } from '../../lib/url'

interface FaviconProps {
  url: string
  title: string
  imgClassName?: string
}

/** Favicon del sitio con cadena de fallback entre fuentes; termina en iniciales. */
export function Favicon({ url, title, imgClassName = 'h-6 w-6' }: FaviconProps) {
  const sources = faviconSources(url)
  const [idx, setIdx] = useState(0)
  useEffect(() => setIdx(0), [url])
  if (idx >= sources.length) return <>{initials(title)}</>
  return (
    <img
      key={sources[idx]}
      src={sources[idx]}
      alt=""
      className={imgClassName}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}
