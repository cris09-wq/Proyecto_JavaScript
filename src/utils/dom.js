// =============================================================================
// dom.js — Utilidades pequeñas de DOM y tiempo, compartidas por los componentes
// =============================================================================
// El DOM (Document Object Model) es la representación de la página HTML que
// JavaScript puede leer y modificar.

/**
 * Escapa texto antes de meterlo en innerHTML (evita inyectar HTML desde la API).
 * Convierte caracteres especiales en su versión "segura":  <  →  &lt;  etc.
 * Así, si alguien escribe "<script>" como nombre, se muestra como texto y no se ejecuta.
 */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Pausa durante `ms` milisegundos (1000 ms = 1 segundo).
 * Devuelve una Promesa que se resuelve cuando pasa el tiempo, así se puede usar
 * con await:  await sleep(500);  // espera medio segundo
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Dispara un evento personalizado que sube por el DOM hasta gameApp.
 * Es la forma en que los componentes "hijos" avisan al componente principal que
 * algo pasó (ej. 'player-logged-in'), sin depender directamente de él.
 *
 * @param element Elemento desde donde se lanza el evento.
 * @param name    Nombre del evento.
 * @param detail  Datos extra que viajan con el evento.
 */
export function emit(element, name, detail = {}) {
  // bubbles: true → el evento "burbujea" (sube) por los elementos padres.
  element.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}
