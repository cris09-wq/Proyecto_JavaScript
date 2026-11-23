// =============================================================================
// validators.js — Funciones que revisan si los datos son correctos
// =============================================================================
// Todas devuelven un objeto { ok: true/false, error?: 'mensaje' } para que
// quien las llame sepa si el dato es válido y, si no, qué mensaje mostrar.

/** Valida el formato del nickname (la unicidad se valida contra la API). */
export function validateNickname(raw) {
  // Si `raw` es null/undefined usamos '' y quitamos espacios extremos.
  const nickname = (raw ?? '').trim();
  if (!nickname) return { ok: false, error: 'El nickname es obligatorio.' };
  if (nickname.length < 3) return { ok: false, error: 'Mínimo 3 caracteres.' };
  if (nickname.length > 16) return { ok: false, error: 'Máximo 16 caracteres.' };
  // Expresión regular: solo letras (\p{L}, incluye tildes y ñ), números (\p{N}),
  // guion bajo y guion. La "u" final activa el soporte Unicode.
  // .test() devuelve true si el texto cumple el patrón.
  if (!/^[\p{L}\p{N}_-]+$/u.test(nickname)) {
    return { ok: false, error: 'Solo letras, números, guion y guion bajo.' };
  }
  return { ok: true, nickname };
}

/** El mazo debe tener exactamente 5 cartas distintas. */
export function validateDeck(ids) {
  if (ids.length !== 5) return { ok: false, error: 'Debes elegir exactamente 5 cartas.' };
  // Un Set no admite repetidos: si al convertir quedan menos de 5, había repetidas.
  if (new Set(ids).size !== 5) return { ok: false, error: 'No puedes repetir cartas.' };
  return { ok: true };
}

/** La partida solo inicia con al menos 10 cartas activas. */
export function hasEnoughActiveCards(cards) {
  // .filter deja solo las cartas activas; .length cuenta cuántas quedaron.
  return cards.filter((c) => c.active).length >= 10;
}
