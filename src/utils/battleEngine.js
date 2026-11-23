// =============================================================================
// battleEngine.js — Reglas del combate (el "motor" de la batalla)
// =============================================================================
// Aquí NO hay nada visual: solo la lógica (vida, daño, turnos, especiales...).
// Separar la lógica de la interfaz hace el código más fácil de entender y probar.
//
// Muchas funciones reciben `rng` (random number generator = generador de números
// aleatorios). Por defecto es Math.random, pero se puede cambiar por otro para
// hacer pruebas con resultados predecibles.
import { randomFloat, pickWeighted } from './random.js';

export const MAX_HP = 250;       // vida máxima por defecto de una carta
export const COMBO_BONUS = 0.1; // +10 % de daño con combo regional

/**
 * Regiones que aparecen 2 o más veces en un mazo de cartas.
 * Ejemplo: si hay 2 cartas de "Caribe" y 1 de "Andina" → devuelve ['Caribe'].
 */
export function getComboRegions(cards) {
  // Objeto que usaremos como contador: { Caribe: 2, Andina: 1, ... }
  const count = {};
  // forEach recorre cada carta y suma 1 a su región (si no existía, empieza en 0).
  cards.forEach((c) => (count[c.region] = (count[c.region] ?? 0) + 1));
  // Object.keys da la lista de regiones; .filter deja solo las que tienen 2 o más.
  return Object.keys(count).filter((region) => count[region] >= 2);
}

/** Crea los estados del mazo marcando las cartas que activan combo regional. */
export function createDeckStates(cards) {
  const combos = getComboRegions(cards);
  // .map transforma cada carta en un objeto "estado" nuevo.
  // `.includes()` revisa si la región de la carta está en la lista de combos.
  return cards.map((card) => ({ ...createCardState(card), hasCombo: combos.includes(card.region) }));
}

/**
 * Estado de una carta dentro del combate.
 * La carta (`card`) tiene los datos fijos (nombre, ataques...). El estado guarda
 * lo que CAMBIA durante la partida (vida actual, si está defendiendo, etc.).
 */
export function createCardState(card) {
  return {
    card,
    hp: card.hp ?? MAX_HP,  // vida actual; si la carta no define hp, usa 250
    isDefending: false,     // true si eligió defenderse en su último turno
    cooldown: 0, // turnos propios que faltan para volver a usar el especial
    turnsTaken: 0, // turnos propios ya jugados por ESTA carta
    hasCombo: false, // true si su región forma combo en el mazo
  };
}

/** Se llama al comenzar cada turno propio de la carta: el cooldown baja en 1. */
export function startOwnTurn(cs) {
  // `cs` = "card state" (estado de la carta). `--` resta 1 a la variable.
  if (cs.cooldown > 0) cs.cooldown--;
  return cs;
}

/** El especial se habilita a partir del 2.º turno de la carta (unlockTurn = 2). */
export function isSpecialUnlocked(cs) {
  return cs.turnsTaken >= cs.card.special.unlockTurn - 1;
}

// El especial está "listo" si ya se desbloqueó Y (&&) no está en enfriamiento.
export function isSpecialReady(cs) {
  return isSpecialUnlocked(cs) && cs.cooldown === 0;
}

/** Acciones válidas ahora mismo (nunca incluye el especial bloqueado). */
export function getAvailableActions(cs) {
  // Una acción de ataque por cada ataque de la carta. El `_` es el ataque en sí
  // (no lo usamos); `index` es su posición (0, 1, 2...).
  const actions = cs.card.attacks.map((_, index) => ({ type: 'attack', index }));
  // .push agrega un elemento al final del arreglo. Defender siempre es posible.
  actions.push({ type: 'defend' });
  if (isSpecialReady(cs)) actions.push({ type: 'special' });
  return actions;
}

/**
 * dañoReal = round(dañoBase × factor), factor entre 0.85 y 1.15
 * Es decir, el daño varía ±15 % al azar. `bonus` suma un extra (ej. 0.1 = +10 %).
 * Math.round redondea al entero más cercano.
 */
export function calculateDamage(baseDamage, rng = Math.random, bonus = 0) {
  return Math.round(baseDamage * randomFloat(0.85, 1.15, rng) * (1 + bonus));
}

/**
 * "IA" de la máquina: solo reglas simples sobre acciones válidas.
 * A cada acción le damos un "peso": mientras más peso, más probable es elegirla.
 *   - especial: 5
 *   - defender: 3 si tiene poca vida (< 90), 1 si no
 *   - atacar:   2
 */
export function chooseMachineAction(cs, rng = Math.random) {
  const lowLife = cs.hp < 90;
  return pickWeighted(
    getAvailableActions(cs).map((action) => ({
      item: action,
      // Ternarios encadenados: es como un if / else if / else en una línea.
      weight: action.type === 'special' ? 5 : action.type === 'defend' ? (lowLife ? 3 : 1) : 2,
    })),
    rng
  );
}

/**
 * Resuelve una acción. Modifica los estados recibidos y devuelve un resumen
 * para que la interfaz anime y narre lo ocurrido.
 *
 * @param attacker Estado de la carta que actúa.
 * @param defender Estado de la carta rival.
 * @param action   { type: 'attack' | 'defend' | 'special', index? }
 */
export function resolveAction(attacker, defender, action, rng = Math.random) {
  // Sacamos la carta del atacante para escribir menos (card en vez de attacker.card).
  const { card } = attacker;

  // --- Caso 1: DEFENDER ---------------------------------------------------
  if (action.type === 'defend') {
    attacker.turnsTaken++;
    attacker.isDefending = true;
    return { type: 'defend', name: card.defense.name, damage: 0, blocked: false, defeated: false };
  }

  // Seguridad: no se permite usar un especial que aún no está listo.
  if (action.type === 'special' && !isSpecialReady(attacker)) {
    throw new Error('El poder especial está bloqueado');
  }

  // --- Caso 2: ATACAR o ESPECIAL -----------------------------------------
  // Elegimos el movimiento: el especial o el ataque en la posición indicada.
  const move = action.type === 'special' ? card.special : card.attacks[action.index];
  // Calculamos el daño (con bonus de combo si la carta lo tiene).
  let damage = calculateDamage(move.baseDamage, rng, attacker.hasCombo ? COMBO_BONUS : 0);

  // Si el rival estaba defendiendo, reducimos el daño según su defensa.
  // Ej. damageReduction = 0.4 → recibe solo el 60 % del daño.
  let blocked = false;
  if (defender.isDefending) {
    damage = Math.round(damage * (1 - defender.card.defense.damageReduction));
    defender.isDefending = false; // la defensa se gasta con el siguiente ataque recibido
    blocked = true;
  }

  // Restamos la vida. Math.max(0, ...) evita que la vida quede negativa.
  defender.hp = Math.max(0, defender.hp - damage);
  attacker.turnsTaken++;
  // Si usó el especial, debe esperar unos turnos (cooldown) para repetirlo.
  if (action.type === 'special') attacker.cooldown = card.special.cooldown;

  // Resumen de lo que pasó, para mostrarlo en pantalla.
  return {
    type: action.type,
    name: move.name,
    damage,
    blocked,
    defeated: defender.hp === 0, // true si el rival quedó sin vida
  };
}
