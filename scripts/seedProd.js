import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const force = args.includes('--force');
const baseUrl = (args.find((a) => a.startsWith('http')) ?? process.env.VITE_API_PROD_URL ?? '')
  .replace(/\/+$/, '');

if (!baseUrl) {
  console.error('Falta la URL. Ej: node scripts/seedProd.js https://xxxx.supabase.co/rest/v1');
  process.exit(1);
}

const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
const isSupabase = baseUrl.includes('supabase.co');

if (isSupabase && !anonKey) {
  console.error('Falta VITE_SUPABASE_PUBLISHABLE_KEY (o VITE_SUPABASE_ANON_KEY) para Supabase');
  process.exit(1);
}

const db = JSON.parse(await readFile(new URL('../src/data/db.json', import.meta.url), 'utf8'));

async function http(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json' };

  if (isSupabase) {
    headers.apikey = anonKey;
    headers.Authorization = `Bearer ${anonKey}`;
    headers.Prefer = 'return=representation';
  }

  const res = await fetch(`${baseUrl}${path}`, { ...options, method, headers });

  if (!res.ok) throw new Error(`HTTP ${res.status} en ${method} ${path}`);

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const tables = ['cards', 'admins', 'players', 'battles'];
const counts = {};

for (const table of tables) {
  const rows = await http(`/${table}`);
  counts[table] = rows?.length ?? 0;
}

if (!force && Object.values(counts).some((n) => n > 0)) {
  console.error(
    `La API ya tiene datos: ${tables.map((t) => `${t}=${counts[t]}`).join(', ')}. Usa --force para recargar.`
  );
  process.exit(1);
}

if (force) {
  for (const table of tables) {
    const rows = await http(`/${table}`);
    for (const row of rows ?? []) {
      await http(`/${table}/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    }
    console.log(`✔ ${table} limpiado`);
  }
}

for (const table of tables) {
  for (const row of db[table]) {
    const created = await http(`/${table}`, {
      method: 'POST',
      body: JSON.stringify(row),
    });
    const saved = Array.isArray(created) ? created[0] : created;
    console.log(`✔ ${table} -> id ${saved?.id ?? row.id}`);
  }
}

console.log('Listo.');
