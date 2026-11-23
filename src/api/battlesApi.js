// =============================================================================
// battlesApi.js — Funciones para guardar y leer partidas jugadas (/battles)
// =============================================================================
import { request } from './apiConfig.js';

// GET /battles → devuelve el historial de todas las partidas.
export async function getBattles() {
  return request('/battles');
}

/**
 * Guarda el registro de una partida terminada.
 * @param {{player:{id:string,nickname:string}, didWin:boolean, playerDeck:string[], machineDeck:string[], startedAt:string}} data
 *
 * Fíjate que los parámetros están entre llaves { }: es desestructuración.
 * La función recibe UN objeto y saca directamente sus propiedades como variables.
 */
export async function postBattle({ player, didWin, playerDeck, machineDeck, startedAt }) {
  return request('/battles', {
    method: 'POST',
    body: JSON.stringify({
      playerId: player.id,
      playerNickname: player.nickname,
      // Operador ternario: si ganó → 'win', si no → 'loss'.
      result: didWin ? 'win' : 'loss',
      // Ganar da 50 puntos; perder da 10 (por participar).
      pointsAwarded: didWin ? 50 : 10,
      playerDeck,  // forma corta de escribir playerDeck: playerDeck
      machineDeck,
      startedAt,
      // Fecha y hora actual en formato estándar ISO (ej. "2026-11-22T15:30:00.000Z").
      endedAt: new Date().toISOString(),
    }),
  });
}
