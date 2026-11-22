import './leaderboardStyles.css';
import { getPlayers } from '../../api/playersApi.js';
import { esc } from '../../utils/dom.js';

/** Ranking de mayor a menor puntaje con podio destacado para el Top 3. */
export class GameLeaderboard extends HTMLElement {
  constructor() {
    super();
    this.playerId = null; // id del jugador actual (se resalta en el ranking)
    this.render();
    this.configurarEventos();
  }

  connectedCallback() {
    this.cargar();
  }

  render() {
    this.innerHTML = `<section class="panel"><span class="spin"></span>Cargando ranking…</section>`;
  }

  configurarEventos() {
    this.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="retry"]')) {
        this.render();
        this.cargar();
      }
    });
  }

  async cargar() {
    try {
      const jugadores = await getPlayers(); // GET
      this.pintar(jugadores);
    } catch (error) {
      console.error(error);
      this.innerHTML = `<section class="panel"><p class="msg err">No se pudo cargar el ranking.</p><button class="btn" data-act="retry">Reintentar</button></section>`;
    }
  }

  pintar(jugadores) {
    const lista = [...jugadores].sort((a, b) => b.points - a.points || b.wins - a.wins);
    const yo = this.playerId;
    const puesto = (p, pos) =>
      p
        ? `<div class="pd p${pos} ${p.id === yo ? 'me' : ''}">
            ${pos === 1 ? '<span class="sparks" aria-hidden="true"></span>' : ''}
            <div class="medal" aria-label="Puesto ${pos}"><span>${pos}</span></div>
            <div class="nk">${esc(p.nickname)}</div>
            <div class="pt">${p.points}</div><small class="lbl">puntos</small>
            <small>🏅 ${p.wins} victorias</small><small>🎮 ${p.gamesPlayed} partidas</small>
          </div>`
        : `<div class="pd p${pos} empty"><div class="q">?</div><small>Libre</small></div>`;

    this.innerHTML = /* html */ `
      <div class="stepbar"><div><div class="eyebrow">CLASIFICACIÓN</div><h2>Leaderboard</h2></div></div>
      <div class="podium">${puesto(lista[1], 2)}${puesto(lista[0], 1)}${puesto(lista[2], 3)}</div>
      ${lista.length > 3
        ? `<table class="lb-table"><thead><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Vict.</th><th>Partidas</th></tr></thead><tbody>
          ${lista.slice(3).map((p, i) => `<tr class="${p.id === yo ? 'me' : ''}"><td>${i + 4}</td><td>${esc(p.nickname)}</td><td>${p.points}</td><td>${p.wins}</td><td>${p.gamesPlayed}</td></tr>`).join('')}
        </tbody></table>`
        : ''}
      ${lista.length === 0 ? '<p class="note">Aún no hay jugadores. ¡Sé el primero!</p>' : ''}`;
  }
}

customElements.define('game-leaderboard', GameLeaderboard);
