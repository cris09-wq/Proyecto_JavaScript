// =============================================================================
// apiConfig.js — Configuración central para hablar con el servidor (la "API")
// =============================================================================
// Una API es un servidor al que le pedimos o le enviamos datos por internet
// (cartas, jugadores, batallas...). Este archivo decide A QUÉ servidor hablar y
// ofrece una sola función, `request`, que usan todos los demás archivos *Api.js.
//
// Selección del entorno con switch (requisito 16 del enunciado).
// VITE_API_MODE=development -> JSON Server local (en tu computador)
// VITE_API_MODE=production  -> API pública (MockAPI, Supabase REST, Railway...)

// `import.meta.env` es un objeto que crea Vite con las variables del archivo .env.
// El operador `??` ("nullish coalescing") significa: "si lo de la izquierda es
// null o undefined, usa lo de la derecha". Así evitamos errores si no existe.
const env = import.meta.env ?? {};

// Declaramos la variable con `let` (y no `const`) porque le daremos valor más abajo.
let API_URL;

// `switch` compara un valor con varios casos posibles.
switch (env.VITE_API_MODE) {
  // Si el modo es "production", usamos la URL de la API pública.
  case 'production':
    API_URL = env.VITE_API_PROD_URL;
    break; // `break` sale del switch para no ejecutar los casos de abajo.

  // Si el modo es "development" o cualquier otra cosa (default),
  // usamos la URL local; si no está definida, por defecto localhost:3000.
  case 'development':
  default:
    API_URL = env.VITE_API_DEV_URL ?? 'http://localhost:3000';
    break;
}

// Si después del switch seguimos sin URL, detenemos todo con un error claro.
// `throw` lanza un error que corta la ejecución del programa.
if (!API_URL) {
  throw new Error(
    'Falta la URL de la API. Revisa VITE_API_PROD_URL / VITE_API_DEV_URL en tu archivo .env'
  );
}

// Sin "/" final para poder concatenar rutas como `${API_URL}/cards`
// `.replace(/\/+$/, '')` usa una expresión regular: busca una o más "/" al final
// del texto ($ = final) y las reemplaza por nada.
// `export` permite que otros archivos importen estas constantes.
export const BASE_URL = API_URL.replace(/\/+$/, '');
export const API_MODE = env.VITE_API_MODE ?? 'development';

/**
 * Único punto donde se llama a fetch().
 * Los archivos *Api.js la usan; los componentes NO llaman a fetch directamente.
 *
 * `async` indica que la función es asíncrona: tarda un tiempo (espera la
 * respuesta del servidor) y devuelve una Promesa. Dentro usamos `await` para
 * "esperar" el resultado sin congelar la página.
 *
 * @param {string} path    Ruta del recurso, por ejemplo '/cards' o '/players/3'.
 * @param {object} options Opciones de fetch: method (GET, POST...), body, etc.
 *                         `= {}` es un valor por defecto si no se envía nada.
 */
export async function request(path, options = {}) {
  // fetch() hace la petición HTTP al servidor.
  // Usamos una "template string" (comillas invertidas ``) para unir textos: ${variable}.
  const response = await fetch(`${BASE_URL}${path}`, {
    // Le decimos al servidor que los datos que enviamos están en formato JSON.
    headers: { 'Content-Type': 'application/json' },
    // `...options` (operador "spread") copia aquí todas las propiedades de options.
    ...options,
  });

  // `response.ok` es true si el código HTTP está entre 200 y 299 (todo salió bien).
  // Si no, lanzamos un error indicando qué falló (ej. "HTTP 404 en GET /cards/99").
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${options.method ?? 'GET'} ${path}`);
  }

  // DELETE puede responder sin cuerpo (204)
  if (response.status === 204) return null;

  // Leemos la respuesta como texto. Si trae algo, lo convertimos de JSON
  // (texto) a un objeto de JavaScript con JSON.parse. Si viene vacía, null.
  // `condición ? siVerdadero : siFalso` es el operador ternario (un if corto).
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Quita el id para que lo asigne el servidor (necesario en MockAPI y evita choques en JSON Server).
 *
 * Usa "desestructuración": `const { id, ...rest } = data` saca la propiedad `id`
 * en su propia variable y guarda TODO lo demás en `rest`. Devolvemos solo `rest`.
 */
export function withoutId(data) {
  const { id, ...rest } = data;
  return rest;
}
