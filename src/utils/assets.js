// db.json guarda rutas como "/images/cards/x.webp". En GitHub Pages el sitio vive
// en /nombre-repo/, así que una ruta absoluta se rompe. Esta función las resuelve
// con la base de Vite (usa base './' en vite.config.js).

export function assetUrl(path) {
  const base = import.meta.env?.BASE_URL ?? '/';
  return `${base}${String(path).replace(/^\/+/, '')}`;
}
