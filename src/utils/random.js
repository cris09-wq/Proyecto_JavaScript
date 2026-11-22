export function randomFloat(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}

export function shuffle(list, rng = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Sorteo de quién inicia: true = jugador, false = máquina. */
export function playerStarts(rng = Math.random) {
  return rng() < 0.5;
}

/** Elige un elemento de [{item, weight}] según su peso. */
export function pickWeighted(entries, rng = Math.random) {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let r = rng() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.item;
  }
  return entries[entries.length - 1].item;
}
