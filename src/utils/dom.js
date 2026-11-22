// Utilidades pequeñas de DOM y tiempo, compartidas por los componentes.

/** Escapa texto antes de meterlo en innerHTML (evita inyectar HTML desde la API). */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Dispara un evento personalizado que sube por el DOM hasta gameApp. */
export function emit(element, name, detail = {}) {
  element.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}
