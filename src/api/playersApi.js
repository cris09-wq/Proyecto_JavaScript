// =============================================================================
// playersApi.js — Funciones para trabajar con los jugadores (/players)
// =============================================================================
import { request } from './apiConfig.js';

// GET /players → lista de todos los jugadores.
export async function getPlayers() {
  return request('/players');
}

/**
 * Busca un jugador por nickname consultando la API.
 * La comparación se hace aquí (exacta y sin distinguir mayúsculas) porque
 * cada API filtra distinto: JSON Server exacto, MockAPI por coincidencia parcial.
 */
export async function findPlayerByNickname(nickname) {
  const players = await getPlayers();
  // Pasamos el nombre buscado a minúsculas y sin espacios para comparar
  // "Diana", "diana " y "DIANA" como si fueran el mismo.
  const wanted = nickname.trim().toLowerCase();
  // Si .find() no encuentra nada devuelve undefined; con `?? null` devolvemos null.
  return players.find((p) => p.nickname.trim().toLowerCase() === wanted) ?? null;
}

/** Consulta un jugador por id (404 si no existe). */
export async function getPlayerById(id) {
  return request(`/players/${id}`);
}

// POST /players → crea un jugador nuevo con sus estadísticas en cero.
export async function postPlayer(nickname, avatar) {
  return request('/players', {
    method: 'POST',
    body: JSON.stringify({
      nickname: nickname.trim(),
      avatar,
      points: 0,      // puntos acumulados
      wins: 0,        // partidas ganadas
      losses: 0,      // partidas perdidas
      gamesPlayed: 0, // partidas jugadas en total
      createdAt: new Date().toISOString(),
    }),
  });
}

// PATCH /players/:id → modifica solo los campos que enviemos en `data`.
export async function patchPlayer(data, id) {
  return request(`/players/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// DELETE /players/:id → elimina al jugador.
export async function deletePlayer(id) {
  return request(`/players/${id}`, { method: 'DELETE' });
}

/**
 * Suma el resultado de una partida al jugador (puntos acumulativos).
 * Lee el estado actual del servidor para no pisar datos de otra pestaña.
 *
 * @param {string}  playerId Id del jugador.
 * @param {boolean} didWin   true si ganó, false si perdió.
 */
export async function addBattleResult(playerId, didWin) {
  // 1) Pedimos los datos más recientes del jugador.
  const current = await request(`/players/${playerId}`);
  // 2) Calculamos los nuevos valores sumando a los actuales y los guardamos.
  return patchPlayer(
    {
      points: current.points + (didWin ? 50 : 10),
      wins: current.wins + (didWin ? 1 : 0),
      losses: current.losses + (didWin ? 0 : 1),
      gamesPlayed: current.gamesPlayed + 1,
    },
    playerId
  );
}
