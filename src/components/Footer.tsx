import { quoteOfTheDay } from '../data/seed'

export function Footer() {
  const quote = quoteOfTheDay()
  return (
    <footer className="pt-4 text-center">
      <p className="text-sm italic text-slate-500">
        <span className="font-serif">{quote.text}</span>
        <span className="mx-2 text-slate-600">—</span>
        <span className="not-italic tracking-[0.15em] text-slate-600">
          {quote.author.toUpperCase()}
        </span>
      </p>
    </footer>
  )
}
