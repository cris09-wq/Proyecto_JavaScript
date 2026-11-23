import './appStyles.css';
import '../auth/playerRegister.js';
import '../auth/adminLogin.js';
import '../cards/cards.js';
import '../admin/adminPanel.js';
import '../deck/deckSelector.js';
import '../battle/battle.js';
import '../leaderboard/leaderboard.js';
import { getPlayerById, patchPlayer } from '../../api/playersApi.js';
import { esc } from '../../utils/dom.js';
import { isMuted, toggleMute, startMusicOnFirstInteraction, setMusicVolume } from '../../utils/audio.js';
import { assetUrl } from '../../utils/assets.js';

const PLAYER_KEY = 'cba:player'; // el jugador queda guardado en este navegador
const ADMIN_KEY = 'cba:admin'; // la sesión de admin dura mientras la pestaña esté abierta

const leer = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};
const guardar = (storage, key, value) => {
  try {
    value ? storage.setItem(key, JSON.stringify(value)) : storage.removeItem(key);
  } catch {
    /* sin almacenamiento: la sesión vive solo en memoria */
  }
};

/** Conserva el avatar elegido si la API devuelve el jugador sin ese campo. */
const conAvatar = (nuevo, anterior) => ({ ...nuevo, avatar: nuevo.avatar ?? anterior?.avatar });

/**
 * Componente raíz <card-game-app>: encabezado, navegación y cambio de vistas.
 * Los demás componentes se comunican con él mediante eventos personalizados.
 */
export class GameApp extends HTMLElement {
  constructor() {
    super();
    this.state = {
      view: 'register', // register | pick | battle | ranking | admin
      player: leer(localStorage, PLAYER_KEY),
      admin: leer(sessionStorage, ADMIN_KEY),
      deck: null,
      inBattle: false,
    };
    this.render();
    this.configurarEventos();
    startMusicOnFirstInteraction(); // música de fondo permanente
    this.mostrar(this.state.player ? 'pick' : 'register');
    this.refrescarJugador();
  }

  render() {
    this.innerHTML = /* html */ `
      <div class="stage">
        <div class="sheet">
          <header class="top" id="top"></header>
          <main id="main"></main>
        </div>
        <div class="foot">Card Battle Arena · Sabores de Colombia · Proyecto integrador JavaScript</div>
      </div>`;
    this.renderHeader();
  }

  renderHeader() {
    const { view, player, admin, inBattle } = this.state;
    const jugar = ['register', 'pick', 'battle'].includes(view);
    const nav = admin
      ? `<span class="chip">🛠️ Admin</span>
         <button class="nbtn ${view === 'admin' ? 'on' : ''}" data-nav="admin">Panel</button>`
      : `${player ? `<span class="chip">👤 ${esc(player.nickname)} · ${player.points} pts</span>` : ''}
         <button class="nbtn ${jugar ? 'on' : ''}" data-nav="play" ${inBattle ? 'disabled' : ''}>Jugar</button>
         <button class="nbtn ${view === 'ranking' ? 'on' : ''}" data-nav="rank" ${inBattle ? 'disabled' : ''}>Ranking</button>
         ${player ? '' : `<button class="nbtn" data-nav="admin">Admin</button>`}`;
    this.querySelector('#top').innerHTML = /* html */ `
      <div class="brand"><span class="flag"></span><b>Sabores de Colombia</b></div>
      <nav>
        ${nav}
        ${player || admin ? `<button class="nbtn" data-nav="logout">Cerrar sesión</button>` : ''}
        <button class="nbtn" data-nav="mute" title="Sonido" aria-label="Activar o silenciar sonido">${isMuted() ? '🔇' : '🔊'}</button>
      </nav>`;
  }

  /** Cambia la vista principal. Cada vista es un Web Component distinto. */
  mostrar(view) {
    this.state.view = view;
    this.aplicarFondo(view);
    if (view !== 'battle') setMusicVolume(1); // fuera de la batalla, volumen normal
    const main = this.querySelector('#main');
    const { player, admin, deck } = this.state;

    if (view === 'register') {
      main.innerHTML = '<player-register></player-register>';
      main.firstElementChild.currentPlayer = player;
    } else if (view === 'pick') {
      main.innerHTML = '<deck-selector></deck-selector>';
    } else if (view === 'battle') {
      main.innerHTML = '<battle-arena></battle-arena>';
      main.firstElementChild.start({ player, deck: deck.deck, pool: deck.pool });
    } else if (view === 'ranking') {
      main.innerHTML = '<game-leaderboard></game-leaderboard>';
      main.firstElementChild.playerId = player?.id ?? null;
    } else if (view === 'admin') {
      main.innerHTML = admin ? '<admin-panel></admin-panel>' : '<admin-login></admin-login>';
    }
    this.renderHeader();
  }

  /**
   * Fondo del juego: foto del pueblo con un velo azul marino.
   * En el inicio el velo es más suave y la hoja se vuelve de vidrio esmerilado.
   */
  aplicarFondo(view) {
    // Vidrio claro: inicio, elegir cartas y admin
    const inicio = ['register', 'pick', 'admin'].includes(view);
    const ranking = view === 'ranking';
    const velo = inicio
      ? 'rgba(13, 15, 43, 0.12), rgba(27, 36, 103, 0.3)'
      : ranking
        ? 'rgba(13, 15, 43, 0.25), rgba(27, 36, 103, 0.45)'
        : 'rgba(13, 15, 43, 0.5), rgba(27, 36, 103, 0.7)';
    document.body.style.background = `
        linear-gradient(${velo}),
        url("${assetUrl('/images/fondo.jpg')}") center / cover fixed,
        var(--navy)`;
    const sheet = this.querySelector('.sheet');
    sheet?.classList.toggle('glass', inicio);
    sheet?.classList.toggle('glass-dark', ranking); // vidrio oscuro para el ranking
    this.querySelector('.stage')?.classList.toggle('centrada', view === 'register' || view === 'admin'); // inicio y admin centrados en vertical
    sheet?.classList.toggle('wide', view === 'battle'); // la batalla usa más ancho (tablero + historial)
  }

  /** Vuelve a pedir el jugador a la API para mostrar sus puntos actuales. */
  async refrescarJugador() {
    const { player } = this.state;
    if (!player) return;
    try {
      this.state.player = conAvatar(await getPlayerById(player.id), player);
      guardar(localStorage, PLAYER_KEY, this.state.player);
      this.renderHeader();
      if (this.state.view === 'register') this.querySelector('player-register').currentPlayer = this.state.player;
    } catch {
      // Si el jugador ya no existe (base de datos reiniciada) se olvida; si no hay red, se conserva.
      if (navigator.onLine !== false) {
        /* error de red o 404: no se borra nada para no perder la sesión por un fallo temporal */
      }
    }
  }

  irAJugar() {
    this.mostrar(this.state.player ? 'pick' : 'register');
  }

  cerrarSesion() {
    const eraAdmin = Boolean(this.state.admin);
    guardar(localStorage, PLAYER_KEY, null);
    guardar(sessionStorage, ADMIN_KEY, null);
    Object.assign(this.state, { player: null, admin: null, deck: null, inBattle: false });
    this.mostrar(eraAdmin ? 'admin' : 'register');
  }

  configurarEventos() {
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nav]');
      if (!btn || btn.disabled) return;
      const destino = btn.dataset.nav;
      if (destino === 'mute') {
        toggleMute();
        btn.textContent = isMuted() ? '🔇' : '🔊';
      } else if (destino === 'logout') this.cerrarSesion();
      else if (destino === 'play') this.irAJugar();
      else if (destino === 'rank') this.mostrar('ranking');
      else if (destino === 'admin') this.mostrar('admin');
    });

    // ----- Eventos que llegan desde los componentes -----
    this.addEventListener('player-registered', (e) => {
      this.state.player = e.detail.player;
      guardar(localStorage, PLAYER_KEY, this.state.player);
      this.mostrar('pick');
    });
    this.addEventListener('player-continue', (e) => {
      const { avatar, player: entrante } = e.detail ?? {};
      if (entrante) {
        this.state.player = conAvatar(entrante, entrante);
        guardar(localStorage, PLAYER_KEY, this.state.player);
      }
      const player = this.state.player;
      if (!player) return;
      if (avatar && avatar !== player.avatar) {
        this.state.player = { ...player, avatar };
        guardar(localStorage, PLAYER_KEY, this.state.player);
        patchPlayer({ avatar }, player.id).catch((error) => console.error(error)); // se guarda también en la API
      }
      this.mostrar('pick');
    });
    this.addEventListener('deck-ready', (e) => {
      this.state.deck = e.detail;
      this.mostrar('battle');
    });
    this.addEventListener('battle-state', (e) => {
      this.state.inBattle = e.detail.active;
      setMusicVolume(e.detail.active ? 0.1 : 1); // durante la partida la música baja al 10 %
      this.renderHeader();
    });
    this.addEventListener('battle-finished', (e) => {
      this.state.player = conAvatar(e.detail.player, this.state.player);
      guardar(localStorage, PLAYER_KEY, this.state.player);
      this.renderHeader();
    });
    this.addEventListener('battle-abandoned', () => {
      this.state.inBattle = false;
      this.mostrar('pick');
    });
    this.addEventListener('play-again', () => this.mostrar('pick'));
    this.addEventListener('go-ranking', () => this.mostrar('ranking'));
    this.addEventListener('admin-login-success', (e) => {
      this.state.admin = e.detail.admin;
      guardar(sessionStorage, ADMIN_KEY, this.state.admin);
      this.mostrar('admin');
    });
    this.addEventListener('admin-logout', () => this.cerrarSesion());
  }
}

customElements.define('card-game-app', GameApp);
