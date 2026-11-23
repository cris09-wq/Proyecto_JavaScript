// =============================================================================
// gameApp.js — Componente principal <card-game-app>
// =============================================================================
// Este es el "director" de la aplicación: dibuja el encabezado, decide qué
// pantalla (vista) se muestra y guarda el estado general (jugador, admin, mazo).
//
// El proyecto usa WEB COMPONENTS: etiquetas HTML propias (como <player-register>)
// creadas con clases de JavaScript. Cada pantalla es un componente distinto.

// Importar un .css desde JS es algo que permite Vite: inyecta los estilos en la página.
import './appStyles.css';
// Estas importaciones no traen variables: solo ejecutan el archivo para que cada
// componente quede registrado (customElements.define) y su etiqueta funcione.
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

// localStorage guarda datos para siempre en este navegador;
// sessionStorage los guarda solo mientras la pestaña esté abierta.
const PLAYER_KEY = 'cba:player'; // el jugador queda guardado en este navegador
const ADMIN_KEY = 'cba:admin'; // la sesión de admin dura mientras la pestaña esté abierta

// Lee un dato del almacenamiento y lo convierte de texto JSON a objeto.
// Si algo falla (dato dañado o almacenamiento bloqueado) devuelve null.
const leer = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};
// Guarda un dato (convertido a texto JSON). Si `value` es null/vacío, lo borra.
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
 *
 * `class ... extends HTMLElement` crea una etiqueta HTML personalizada que
 * hereda todo lo que puede hacer un elemento HTML normal.
 */
export class GameApp extends HTMLElement {
  // El constructor se ejecuta automáticamente cuando el navegador crea la etiqueta.
  constructor() {
    super(); // obligatorio: llama al constructor de HTMLElement (la clase "padre")
    // `this` es el propio componente. En `this.state` guardamos sus datos.
    this.state = {
      view: 'register', // register | pick | battle | ranking | admin
      player: leer(localStorage, PLAYER_KEY), // jugador recordado (o null)
      admin: leer(sessionStorage, ADMIN_KEY), // admin con sesión abierta (o null)
      deck: null,     // mazo elegido para la batalla
      inBattle: false, // true mientras se juega una partida
    };
    this.render();
    this.configurarEventos();
    startMusicOnFirstInteraction(); // música de fondo permanente
    // Si ya hay un jugador guardado, vamos directo a elegir cartas.
    this.mostrar(this.state.player ? 'pick' : 'register');
    this.refrescarJugador();
  }

  // Dibuja la estructura base: un encabezado (#top) y una zona principal (#main).
  // innerHTML reemplaza el contenido HTML del componente por este texto.
  // El comentario /* html */ solo sirve para que algunos editores coloreen el HTML.
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

  // Dibuja el encabezado con los botones de navegación según quién haya iniciado sesión.
  renderHeader() {
    const { view, player, admin, inBattle } = this.state;
    // true si estamos en alguna de las pantallas de "Jugar" (para resaltar el botón).
    const jugar = ['register', 'pick', 'battle'].includes(view);
    // Si hay admin, mostramos el menú de admin; si no, el del jugador.
    // Los botones llevan data-nav="..." para saber a dónde ir al hacer clic.
    // Durante la batalla (inBattle) se desactivan "Jugar" y "Ranking".
    const nav = admin
      ? `<span class="chip">🛠️ Admin</span>
         <button class="nbtn ${view === 'admin' ? 'on' : ''}" data-nav="admin">Panel</button>`
      : `${player ? `<span class="chip">👤 ${esc(player.nickname)} · ${player.points} pts</span>` : ''}
         <button class="nbtn ${jugar ? 'on' : ''}" data-nav="play" ${inBattle ? 'disabled' : ''}>Jugar</button>
         <button class="nbtn ${view === 'ranking' ? 'on' : ''}" data-nav="rank" ${inBattle ? 'disabled' : ''}>Ranking</button>
         ${player ? '' : `<button class="nbtn" data-nav="admin">Admin</button>`}`;
    // querySelector busca el primer elemento que coincida con el selector CSS (#top = id "top").
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

    // Según la vista, ponemos la etiqueta del componente correspondiente.
    // `main.firstElementChild` es el componente recién creado; le pasamos datos.
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
      // Si el admin ya inició sesión, ve el panel; si no, el formulario de login.
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
    // El "velo" es un degradado de colores semitransparentes (rgba: rojo, verde, azul, opacidad).
    const velo = inicio
      ? 'rgba(13, 15, 43, 0.12), rgba(27, 36, 103, 0.3)'
      : ranking
        ? 'rgba(13, 15, 43, 0.25), rgba(27, 36, 103, 0.45)'
        : 'rgba(13, 15, 43, 0.5), rgba(27, 36, 103, 0.7)';
    // Cambiamos el estilo CSS del <body> directamente desde JavaScript.
    document.body.style.background = `
        linear-gradient(${velo}),
        url("${assetUrl('/images/fondo.jpg')}") center / cover fixed,
        var(--navy)`;
    const sheet = this.querySelector('.sheet');
    // classList.toggle(clase, condición): agrega la clase si la condición es true, la quita si es false.
    sheet?.classList.toggle('glass', inicio);
    sheet?.classList.toggle('glass-dark', ranking); // vidrio oscuro para el ranking
    this.querySelector('.stage')?.classList.toggle('centrada', view === 'register'); // inicio centrado en vertical
    sheet?.classList.toggle('wide', view === 'battle'); // la batalla usa más ancho (tablero + historial)
  }

  /** Vuelve a pedir el jugador a la API para mostrar sus puntos actuales. */
  async refrescarJugador() {
    const { player } = this.state;
    if (!player) return; // si no hay jugador, no hay nada que refrescar
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

  // Botón "Jugar": si hay jugador va a elegir cartas; si no, a registrarse.
  irAJugar() {
    this.mostrar(this.state.player ? 'pick' : 'register');
  }

  // Borra la sesión (jugador y admin) y vuelve a la pantalla correspondiente.
  cerrarSesion() {
    const eraAdmin = Boolean(this.state.admin); // Boolean() convierte cualquier valor en true/false
    guardar(localStorage, PLAYER_KEY, null);
    guardar(sessionStorage, ADMIN_KEY, null);
    // Object.assign copia varias propiedades de una sola vez sobre this.state.
    Object.assign(this.state, { player: null, admin: null, deck: null, inBattle: false });
    this.mostrar(eraAdmin ? 'admin' : 'register');
  }

  // Configura qué pasa con cada clic y con cada evento que envían los componentes hijos.
  configurarEventos() {
    // "Delegación de eventos": escuchamos TODOS los clics en el componente y luego
    // revisamos si se hizo clic en un botón con data-nav. Así funciona aunque el
    // HTML se vuelva a dibujar.
    this.addEventListener('click', (e) => {
      // e.target es el elemento clicado; .closest() sube hasta encontrar uno con [data-nav].
      const btn = e.target.closest('[data-nav]');
      if (!btn || btn.disabled) return;
      // btn.dataset.nav lee el atributo data-nav del botón.
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
    // Los componentes hijos usan emit(...) (ver utils/dom.js) y aquí los recibimos.
    // `e.detail` trae los datos que envió el hijo.

    // Un jugador nuevo se registró → lo guardamos y vamos a elegir cartas.
    this.addEventListener('player-registered', (e) => {
      this.state.player = e.detail.player;
      guardar(localStorage, PLAYER_KEY, this.state.player);
      this.mostrar('pick');
    });
    // Un jugador existente continúa (puede haber cambiado de avatar).
    this.addEventListener('player-continue', (e) => {
      // `?? {}` evita error si detail viene vacío. `player: entrante` renombra la variable.
      const { avatar, player: entrante } = e.detail ?? {};
      if (entrante) {
        this.state.player = conAvatar(entrante, entrante);
        guardar(localStorage, PLAYER_KEY, this.state.player);
      }
      const player = this.state.player;
      if (!player) return;
      // Si eligió un avatar distinto, lo actualizamos localmente y en la API.
      if (avatar && avatar !== player.avatar) {
        this.state.player = { ...player, avatar };
        guardar(localStorage, PLAYER_KEY, this.state.player);
        patchPlayer({ avatar }, player.id).catch((error) => console.error(error)); // se guarda también en la API
      }
      this.mostrar('pick');
    });
    // El jugador terminó de armar su mazo → empieza la batalla.
    this.addEventListener('deck-ready', (e) => {
      this.state.deck = e.detail;
      this.mostrar('battle');
    });
    // La batalla avisa si está activa o no (para bloquear el menú y bajar la música).
    this.addEventListener('battle-state', (e) => {
      this.state.inBattle = e.detail.active;
      setMusicVolume(e.detail.active ? 0.1 : 1); // durante la partida la música baja al 10 %
      this.renderHeader();
    });
    // Terminó la batalla → actualizamos los puntos del jugador.
    this.addEventListener('battle-finished', (e) => {
      this.state.player = conAvatar(e.detail.player, this.state.player);
      guardar(localStorage, PLAYER_KEY, this.state.player);
      this.renderHeader();
    });
    // El jugador abandonó la partida → vuelve a elegir cartas.
    this.addEventListener('battle-abandoned', () => {
      this.state.inBattle = false;
      this.mostrar('pick');
    });
    this.addEventListener('play-again', () => this.mostrar('pick'));
    this.addEventListener('go-ranking', () => this.mostrar('ranking'));
    // El admin inició sesión correctamente → lo guardamos y mostramos el panel.
    this.addEventListener('admin-login-success', (e) => {
      this.state.admin = e.detail.admin;
      guardar(sessionStorage, ADMIN_KEY, this.state.admin);
      this.mostrar('admin');
    });
    this.addEventListener('admin-logout', () => this.cerrarSesion());
  }
}

// Registramos la etiqueta: desde ahora <card-game-app> usa la clase GameApp.
// (Los nombres de etiquetas personalizadas deben llevar un guion "-").
customElements.define('card-game-app', GameApp);
