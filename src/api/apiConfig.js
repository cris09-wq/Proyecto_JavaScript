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

export const BASE_URL = API_URL.replace(/\/+$/, '');
export const API_MODE = env.VITE_API_MODE ?? 'development';
export const IS_SUPABASE = API_MODE === 'production' && BASE_URL.includes('supabase.co');

const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '';

if (IS_SUPABASE && !ANON_KEY) {
  throw new Error(
    'Falta VITE_SUPABASE_PUBLISHABLE_KEY (o VITE_SUPABASE_ANON_KEY) en el entorno de Vercel'
  );
}

export async function request(path, options = {}) {
  const { headers: extraHeaders = {}, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };

  if (IS_SUPABASE) {
    headers.apikey = ANON_KEY;
    headers.Authorization = `Bearer ${ANON_KEY}`;
    headers.Prefer = 'return=representation';
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...rest, method, headers });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${method} ${path}`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!IS_SUPABASE || !Array.isArray(data) || data.length !== 1) return data;

  const singlePath = /^\/[^/]+\/[^/?]+(?:\?.*)?$/.test(path);
  return singlePath || method === 'POST' || method === 'PATCH' ? data[0] : data;
}

export function withoutId(data) {
  const { id, ...rest } = data;
  return rest;
}
