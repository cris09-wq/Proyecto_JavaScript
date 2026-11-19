/** Valida el formato del nickname (la unicidad se valida contra la API). */
export function validateNickname(raw) {
  const nickname = (raw ?? '').trim();
  if (!nickname) return { ok: false, error: 'El nickname es obligatorio.' };
  if (nickname.length < 3) return { ok: false, error: 'Mínimo 3 caracteres.' };
  if (nickname.length > 16) return { ok: false, error: 'Máximo 16 caracteres.' };
  if (!/^[\p{L}\p{N}_-]+$/u.test(nickname)) {
    return { ok: false, error: 'Solo letras, números, guion y guion bajo.' };
  }
  return { ok: true, nickname };
}

/** El mazo debe tener exactamente 5 cartas distintas. */
export function validateDeck(ids) {
  if (ids.length !== 5) return { ok: false, error: 'Debes elegir exactamente 5 cartas.' };
  if (new Set(ids).size !== 5) return { ok: false, error: 'No puedes repetir cartas.' };
  return { ok: true };
}

/** La partida solo inicia con al menos 10 cartas activas. */
export function hasEnoughActiveCards(cards) {
  return cards.filter((c) => c.active).length >= 10;
}
