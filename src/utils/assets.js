// =============================================================================
// assets.js — Arma la ruta correcta de imágenes y sonidos
// =============================================================================
// db.json guarda rutas como "/images/cards/x.webp". En GitHub Pages el sitio vive
// en /nombre-repo/, así que una ruta absoluta se rompe. Esta función las resuelve
// con la base de Vite (usa base './' en vite.config.js).
//
// Ejemplo: assetUrl('/images/a.webp') → './images/a.webp'

export function assetUrl(path) {
  // BASE_URL lo define Vite. El `?.` ("encadenamiento opcional") evita un error
  // si `import.meta.env` no existe: en ese caso da undefined y usamos '/'.
  const base = import.meta.env?.BASE_URL ?? '/';
  // String(path) asegura que sea texto; el replace quita las "/" del inicio (^)
  // para que no queden dos barras seguidas al unirlo con la base.
  return `${base}${String(path).replace(/^\/+/, '')}`;
}
