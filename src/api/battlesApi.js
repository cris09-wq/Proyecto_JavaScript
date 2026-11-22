import { request } from './apiConfig.js';

export async function getBattles() {
  return request('/battles');
}

/**
 * Guarda el registro de una partida terminada.
 * @param {{player:{id:string,nickname:string}, didWin:boolean, playerDeck:string[], machineDeck:string[], startedAt:string}} data
 */
export async function postBattle({ player, didWin, playerDeck, machineDeck, startedAt }) {
  return request('/battles', {
    method: 'POST',
    body: JSON.stringify({
      playerId: player.id,
      playerNickname: player.nickname,
      result: didWin ? 'win' : 'loss',
      pointsAwarded: didWin ? 50 : 10,
      playerDeck,
      machineDeck,
      startedAt,
      endedAt: new Date().toISOString(),
    }),
  });
}
