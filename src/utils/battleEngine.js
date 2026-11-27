import { randomFloat, pickWeighted } from './random.js';

export const MAX_HP = 250;
export const COMBO_BONUS = 0.1; // +10 % de daño con combo regional
export const CRIT_CHANCE = 0.12;
export const CRIT_MULTIPLIER = 1.5;
export const DODGE_CHANCE = 0.08;

/** Regiones que aparecen 2 o más veces en un mazo de cartas. */
export function getComboRegions(cards) {
  const count = {};
  cards.forEach((c) => (count[c.region] = (count[c.region] ?? 0) + 1));
  return Object.keys(count).filter((region) => count[region] >= 2);
}

/** Crea los estados del mazo marcando las cartas que activan combo regional. */
export function createDeckStates(cards) {
  const combos = getComboRegions(cards);
  return cards.map((card) => ({ ...createCardState(card), hasCombo: combos.includes(card.region) }));
}

/** Estado de una carta dentro del combate. */
export function createCardState(card) {
  return {
    card,
    hp: card.hp ?? MAX_HP,
    isDefending: false,
    cooldown: 0, // turnos propios que faltan para volver a usar el especial
    turnsTaken: 0, // turnos propios ya jugados por ESTA carta
    hasCombo: false, // true si su región forma combo en el mazo
  };
}

/** Se llama al comenzar cada turno propio de la carta: el cooldown baja en 1. */
export function startOwnTurn(cs) {
  if (cs.cooldown > 0) cs.cooldown--;
  return cs;
}

/** El especial se habilita a partir del 2.º turno de la carta (unlockTurn = 2). */
export function isSpecialUnlocked(cs) {
  return cs.turnsTaken >= cs.card.special.unlockTurn - 1;
}

export function isSpecialReady(cs) {
  return isSpecialUnlocked(cs) && cs.cooldown === 0;
}

/** Acciones válidas ahora mismo (nunca incluye el especial bloqueado). */
export function getAvailableActions(cs) {
  const actions = cs.card.attacks.map((_, index) => ({ type: 'attack', index }));
  actions.push({ type: 'defend' });
  if (isSpecialReady(cs)) actions.push({ type: 'special' });
  return actions;
}

export function calculateDamage(baseDamage, rng = Math.random, bonus = 0) {
  return baseDamage * randomFloat(0.85, 1.15, rng) * (1 + bonus);
}

/** "IA" de la máquina: solo reglas simples sobre acciones válidas. */
export function chooseMachineAction(cs, rng = Math.random) {
  const lowLife = cs.hp < 90;
  const acciones = getAvailableActions(cs).filter((action) => !(action.type === 'defend' && cs.isDefending));
  return pickWeighted(
    acciones.map((action) => ({
      item: action,
      weight: action.type === 'special' ? 5 : action.type === 'defend' ? (lowLife ? 3 : 1) : 2,
    })),
    rng
  );
}

export function choosePlayerAction(cs, foeCs, rng = Math.random) {
  const acciones = getAvailableActions(cs);
  const especial = acciones.find((a) => a.type === 'special');
  if (especial) return especial;

  const vidaBaja = cs.hp < (cs.card.hp ?? MAX_HP) * 0.4;
  if (vidaBaja && !cs.isDefending && !foeCs?.isDefending) return { type: 'defend' };

  const ataques = acciones.filter((a) => a.type === 'attack');
  const maxDanio = Math.max(...ataques.map((a) => cs.card.attacks[a.index].baseDamage));
  const mejores = ataques.filter((a) => cs.card.attacks[a.index].baseDamage === maxDanio);
  return mejores[Math.floor(rng() * mejores.length)];
}

/**
 * Resuelve una acción. Modifica los estados recibidos y devuelve un resumen
 * para que la interfaz anime y narre lo ocurrido.
 */
export function resolveAction(attacker, defender, action, rng = Math.random) {
  const { card } = attacker;

  if (action.type === 'defend') {
    attacker.turnsTaken++;
    attacker.isDefending = true;
    return { type: 'defend', name: card.defense.name, damage: 0, blocked: false, critical: false, dodged: false, defeated: false };
  }

  if (action.type === 'special' && !isSpecialReady(attacker)) {
    throw new Error('El poder especial está bloqueado');
  }

  const move = action.type === 'special' ? card.special : card.attacks[action.index];
  let damage = calculateDamage(move.baseDamage, rng, attacker.hasCombo ? COMBO_BONUS : 0);
  const dodged = rng() < DODGE_CHANCE;
  let critical = false;
  let blocked = false;
  if (!dodged) {
    critical = rng() < CRIT_CHANCE;
    if (critical) damage *= CRIT_MULTIPLIER;
    if (defender.isDefending) {
      damage *= 1 - defender.card.defense.damageReduction;
      defender.isDefending = false;
      blocked = true;
    }
  }

  damage = dodged ? 0 : Math.round(damage);
  defender.hp = Math.max(0, defender.hp - damage);
  attacker.turnsTaken++;
  if (action.type === 'special') attacker.cooldown = card.special.cooldown;

  return {
    type: action.type,
    name: move.name,
    damage,
    blocked,
    critical,
    dodged,
    defeated: defender.hp === 0,
  };
}
