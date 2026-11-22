// Carga las 20 cartas y el admin de src/data/db.json en tu API de producción.
// Uso:  node scripts/seedProd.js https://TU_PROYECTO.mockapi.io/api/v1
//       (o define VITE_API_PROD_URL en el entorno)
// Agrega --force si la API ya tiene cartas y quieres cargarlas igual.

import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const force = args.includes('--force');
const baseUrl = (args.find((a) => a.startsWith('http')) ?? process.env.VITE_API_PROD_URL ?? '')
  .replace(/\/+$/, '');

if (!baseUrl) {
  console.error('Falta la URL. Ej: node scripts/seedProd.js https://xxxx.mockapi.io/api/v1');
  process.exit(1);
}

const db = JSON.parse(await readFile(new URL('../src/data/db.json', import.meta.url), 'utf8'));

async function http(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${options.method ?? 'GET'} ${path}`);
  return res.json();
}

const existing = await http('/cards');
if (existing.length > 0 && !force) {
  console.error(`La API ya tiene ${existing.length} cartas. Usa --force para cargar de todos modos.`);
  process.exit(1);
}

for (const { id, ...card } of db.cards) {
  const created = await http('/cards', { method: 'POST', body: JSON.stringify(card) });
  console.log(`✔ ${card.name} -> id ${created.id}`);
}

const admins = await http('/admins');
if (admins.length === 0) {
  for (const { id, ...admin } of db.admins) {
    await http('/admins', { method: 'POST', body: JSON.stringify(admin) });
    console.log(`✔ admin "${admin.username}" creado`);
  }
}

console.log('Listo.');
