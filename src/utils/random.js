// =============================================================================
// random.js — Funciones de azar (números aleatorios, barajar, sortear)
// =============================================================================
// `rng` es la función que genera números al azar entre 0 y 1 (por defecto
// Math.random). Se recibe como parámetro para poder reemplazarla en pruebas.

/** Número decimal al azar entre `min` y `max`. Ej. randomFloat(0.85, 1.15) → 1.03 */
export function randomFloat(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}

/**
 * Devuelve una COPIA de la lista en orden aleatorio (algoritmo Fisher-Yates).
 * Recorre la lista de atrás hacia adelante e intercambia cada elemento con otro
 * elegido al azar entre los anteriores.
 */
export function shuffle(list, rng = Math.random) {
  const copy = [...list]; // copiamos para no modificar la lista original
  for (let i = copy.length - 1; i > 0; i--) {
    // Posición al azar entre 0 e i. Math.floor redondea hacia abajo.
    const j = Math.floor(rng() * (i + 1));
    // Intercambio de dos elementos usando desestructuración de arreglos.
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Sorteo de quién inicia: true = jugador, false = máquina. (50 % de probabilidad) */
export function playerStarts(rng = Math.random) {
  return rng() < 0.5;
}

/**
 * Elige un elemento de [{item, weight}] según su peso.
 * Ejemplo: [{item:'A', weight:3}, {item:'B', weight:1}] → 'A' sale el 75 % de las veces.
 */
export function pickWeighted(entries, rng = Math.random) {
  // .reduce "acumula" valores: aquí suma todos los pesos.
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  // Número al azar entre 0 y el total.
  let r = rng() * total;
  // Vamos restando pesos; el elemento con el que `r` llegue a 0 o menos es el elegido.
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.item;
  }
  // Por seguridad (errores de redondeo), devolvemos el último.
  return entries[entries.length - 1].item;
}
