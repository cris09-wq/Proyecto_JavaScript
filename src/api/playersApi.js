import { request } from './apiConfig.js';

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
  const wanted = nickname.trim().toLowerCase();
  return players.find((p) => p.nickname.trim().toLowerCase() === wanted) ?? null;
}

/** Consulta un jugador por id (404 si no existe). */
export async function getPlayerById(id) {
  return request(`/players/${id}`);
}

export async function postPlayer(nickname) {
  return request('/players', {
    method: 'POST',
    body: JSON.stringify({
      nickname: nickname.trim(),
      points: 0,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      createdAt: new Date().toISOString(),
    }),
  });
}

export async function patchPlayer(data, id) {
  return request(`/players/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Suma el resultado de una partida al jugador (puntos acumulativos).
 * Lee el estado actual del servidor para no pisar datos de otra pestaña.
 */
export async function addBattleResult(playerId, didWin) {
  const current = await request(`/players/${playerId}`);
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
