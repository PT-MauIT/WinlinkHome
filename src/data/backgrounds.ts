/**
 * Imágenes precargadas por el administrador.
 *
 * Para agregar una foto real: colócala en `public/backgrounds/` y registra una
 * entrada aquí con su `url` (`/backgrounds/archivo.jpg`). Ver el README de esa
 * carpeta para más detalle.
 */
export interface AdminImage {
  id: string
  label: string
  url: string
}

export const ADMIN_IMAGES: AdminImage[] = [
  { id: 'parquetempisque', label: 'Parque Tempisque', url: '/backgrounds/ParqueTempisque.jpg' },
  { id: 'guanacaste-atardecer', label: 'Atardecer guanacasteco', url: '/backgrounds/guanacaste-atardecer.svg' },
  { id: 'bosque-tropical', label: 'Bosque tropical', url: '/backgrounds/bosque-tropical.svg' },
  { id: 'rio-tempisque', label: 'Río Tempisque', url: '/backgrounds/rio-tempisque.svg' },
]
