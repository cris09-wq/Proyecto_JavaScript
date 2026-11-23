// =============================================================================
// seedProd.js — Script de Node.js para llenar la API de producción
// =============================================================================
// Carga las 20 cartas y el admin de src/data/db.json en tu API de producción.
// Uso:  node scripts/seedProd.js https://TU_PROYECTO.mockapi.io/api/v1
//       (o define VITE_API_PROD_URL en el entorno)
// Agrega --force si la API ya tiene cartas y quieres cargarlas igual.
//
// Este archivo NO corre en el navegador: se ejecuta en la terminal con Node.js.

// readFile lee archivos del disco. La versión "promises" permite usar await.
import { readFile } from 'node:fs/promises';

// process.argv son las palabras escritas en la terminal al ejecutar el script.
// Las dos primeras son "node" y la ruta del script, por eso .slice(2) las omite.
const args = process.argv.slice(2);
const force = args.includes('--force'); // true si el usuario escribió --force
// La URL se toma del primer argumento que empiece por "http"; si no hay, de la
// variable de entorno; si tampoco, queda vacía. Luego quitamos "/" del final.
const baseUrl = (args.find((a) => a.startsWith('http')) ?? process.env.VITE_API_PROD_URL ?? '')
  .replace(/\/+$/, '');

// Sin URL no podemos continuar: mostramos el uso correcto y salimos con error (1).
if (!baseUrl) {
  console.error('Falta la URL. Ej: node scripts/seedProd.js https://xxxx.mockapi.io/api/v1');
  process.exit(1);
}

// Leemos db.json y lo convertimos en objeto. `import.meta.url` es la ubicación
// de este archivo, así la ruta funciona sin importar desde dónde se ejecute.
// (En módulos se puede usar await fuera de una función: "top-level await").
const db = JSON.parse(await readFile(new URL('../src/data/db.json', import.meta.url), 'utf8'));

// Pequeña versión de `request` (ver src/api/apiConfig.js) para este script.
async function http(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${options.method ?? 'GET'} ${path}`);
  return res.json();
}

// Si la API ya tiene cartas, no cargamos para no duplicarlas (salvo con --force).
const existing = await http('/cards');
if (existing.length > 0 && !force) {
  console.error(`La API ya tiene ${existing.length} cartas. Usa --force para cargar de todos modos.`);
  process.exit(1);
}

// Recorremos cada carta. Con desestructuración separamos el id (que lo asigna
// el servidor) del resto de datos (`card`), y la enviamos con POST.
for (const { id, ...card } of db.cards) {
  const created = await http('/cards', { method: 'POST', body: JSON.stringify(card) });
  console.log(`✔ ${card.name} -> id ${created.id}`);
}

// Creamos los administradores solo si todavía no hay ninguno.
const admins = await http('/admins');
if (admins.length === 0) {
  for (const { id, ...admin } of db.admins) {
    await http('/admins', { method: 'POST', body: JSON.stringify(admin) });
    console.log(`✔ admin "${admin.username}" creado`);
  }
}

console.log('Listo.');
