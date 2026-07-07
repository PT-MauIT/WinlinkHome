export type GreetingIcon = 'sunrise' | 'sun' | 'moon'

export interface Greeting {
  text: string
  icon: GreetingIcon
}

export function getGreeting(date = new Date()): Greeting {
  const h = date.getHours()
  if (h >= 5 && h < 12) return { text: 'Buenos días', icon: 'sunrise' }
  if (h >= 12 && h < 20) return { text: 'Buenas tardes', icon: 'sun' }
  return { text: 'Buenas noches', icon: 'moon' }
}

/** "LUNES, 6 DE JULIO" */
export function formatDate(date = new Date()): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(date)
    .toUpperCase()
}

/** "22:04" */
export function formatTime(date = new Date()): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
