// Selección del entorno con switch (requisito 16 del enunciado).
// VITE_API_MODE=development -> JSON Server local
// VITE_API_MODE=production  -> API pública (MockAPI, Supabase REST, Railway...)

const env = import.meta.env ?? {};

let API_URL;

switch (env.VITE_API_MODE) {
  case 'production':
    API_URL = env.VITE_API_PROD_URL;
    break;

  case 'development':
  default:
    API_URL = env.VITE_API_DEV_URL ?? 'http://localhost:3000';
    break;
}

if (!API_URL) {
  throw new Error(
    'Falta la URL de la API. Revisa VITE_API_PROD_URL / VITE_API_DEV_URL en tu archivo .env'
  );
}

// Sin "/" final para poder concatenar rutas como `${API_URL}/cards`
export const BASE_URL = API_URL.replace(/\/+$/, '');
export const API_MODE = env.VITE_API_MODE ?? 'development';

/**
 * Único punto donde se llama a fetch().
 * Los archivos *Api.js la usan; los componentes NO llaman a fetch directamente.
 */
export async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${options.method ?? 'GET'} ${path}`);
  }

  // DELETE puede responder sin cuerpo (204)
  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** Quita el id para que lo asigne el servidor (necesario en MockAPI y evita choques en JSON Server). */
export function withoutId(data) {
  const { id, ...rest } = data;
  return rest;
}
