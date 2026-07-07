# Imágenes precargadas por admin

Estas imágenes aparecen en el selector **Origen de imagen → Precargada** (el engranaje
de la esquina inferior derecha).

## Cómo agregar una imagen real

1. Copia el archivo (`.jpg`, `.png`, `.webp`) dentro de esta carpeta `public/backgrounds/`.
   Recomendado: horizontal, mínimo 1600×900, optimizado (< 500 KB).
2. Regístrala en el manifiesto: [`src/data/backgrounds.ts`](../../src/data/backgrounds.ts),
   agregando `{ id, label, url: '/backgrounds/tu-archivo.jpg' }`.

Todo lo que esté en `public/` se copia tal cual a `dist/` durante `pnpm build`, así que
las rutas `/backgrounds/...` funcionan igual en desarrollo y en producción.

Los `.svg` incluidos aquí son placeholders con la estética Guanacaste; puedes
reemplazarlos por fotos reales del Parque Tempisque.
