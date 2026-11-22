import './authStyles.css';
import { HERO_IMG } from '../../assets/heroArt.js';
import { AVATARS, AVATAR_IDS, DEFAULT_AVATAR, bodyImg } from '../../assets/avatars.js';
import { validateNickname } from '../../utils/validators.js';
import { findPlayerByNickname, postPlayer } from '../../api/playersApi.js';
import { esc, emit } from '../../utils/dom.js';

/**
 * Registro del jugador en dos pasos:
 *   1) 'nick'   → escribe el nickname (crear jugador nuevo o ingresar con uno existente).
 *   2) 'avatar' → elige su avatar por región y confirma para ir a elegir las cartas.
 * El jugador nuevo se guarda en la API (POST) al confirmar el avatar.
 */
export class PlayerRegister extends HTMLElement {
  constructor() {
    super();
    this._player = null; // jugador guardado en este navegador (para "Continuar como…")
    this._avatar = DEFAULT_AVATAR; // avatar regional elegido
    this._paso = 'nick'; // nick | avatar
    this._pendiente = null; // { nickname, existente } mientras elige el avatar
    this.render();
    this.configurarEventos();
  }

  /** gameApp entrega aquí el jugador que ya existe en este navegador. */
  set currentPlayer(player) {
    this._player = player;
    if (this._paso === 'nick') {
      if (player?.avatar && AVATARS[player.avatar]) this._avatar = player.avatar;
      this.render();
    }
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="hero">
        <div class="hero-text">
          <div class="eyebrow">BIENVENIDO A</div>
          <h2>Sabores<br>de Colombia</h2>
          ${this._paso === 'nick' ? this.htmlNickname() : this.htmlAvatar()}
        </div>
        ${HERO_IMG}
      </section>`;
  }

  htmlNickname() {
    return /* html */ `
      <p class="lead">Arma un mazo de 5 platos típicos, junta cartas de la misma región para activar el combo y derrota a la máquina. ¡Que gane el mejor sabor!</p>
      <form id="regForm" autocomplete="off" novalidate>
        <label class="nick-field">
          <input id="nick" maxlength="16" placeholder="TU NICKNAME" aria-label="Nickname">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/></svg>
        </label>
        <button class="btn primary" id="regBtn" type="submit">Crear jugador</button>
        <button class="btn ghost" id="loginBtn" type="button" hidden>Ingresar</button>
      </form>
      <p class="msg" id="regMsg" role="status"></p>
      ${this._player ? `<button class="btn" id="again" type="button">Continuar como <b>${esc(this._player.nickname)}</b></button>` : ''}`;
  }

  htmlAvatar() {
    const nombre = this._pendiente?.nickname ?? this._player?.nickname ?? '';
    return /* html */ `
      <p class="lead">¡Hola, <b>${esc(nombre)}</b>! Ahora elige el avatar de tu región.</p>
      <p class="avatar-title">Elige tu avatar por región</p>
      <div class="avatar-picker" role="radiogroup" aria-label="Avatar por región">
        ${AVATAR_IDS.map((id) => this.opcionAvatar(id)).join('')}
      </div>
      <p class="msg" id="regMsg" role="status"></p>
      <button class="btn primary" id="avatarOk" type="button">Elegir cartas</button>
      <button class="btn ghost" id="volver" type="button">Volver</button>`;
  }

  opcionAvatar(id) {
    const a = AVATARS[id];
    const on = id === this._avatar;
    return `<button type="button" class="avatar-opt ${on ? 'on' : ''}" data-avatar="${id}" role="radio" aria-checked="${on}" title="${a.region} · ${a.desc}">
      ${bodyImg(a)}<span>${a.region}</span></button>`;
  }

  /** Marca el avatar elegido sin redibujar todo. */
  elegirAvatar(id) {
    this._avatar = id;
    this.querySelectorAll('.avatar-opt').forEach((b) => {
      const on = b.dataset.avatar === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
  }

  /** Pasa al paso 2 (elegir avatar). */
  irAAvatar(pendiente) {
    this._pendiente = pendiente;
    const avatar = pendiente?.existente?.avatar ?? (pendiente ? null : this._player?.avatar);
    if (avatar && AVATARS[avatar]) this._avatar = avatar;
    this._paso = 'avatar';
    this.render();
  }

  volverANickname() {
    this._paso = 'nick';
    this._pendiente = null;
    this.render();
  }

  configurarEventos() {
    // Delegación: sigue funcionando aunque render() reemplace el HTML.
    this.addEventListener('submit', (e) => {
      e.preventDefault();
      this.registrar();
    });
    // Mientras escribe, se consulta (con pausa) si el nickname ya existe
    this.addEventListener('input', (e) => {
      if (e.target.id !== 'nick') return;
      clearTimeout(this._timer);
      this._consulta = (this._consulta ?? 0) + 1; // invalida respuestas pendientes
      this.mostrarIngresar(false);
      this._timer = setTimeout(() => this.revisarNickname(e.target.value), 400);
    });
    this.addEventListener('click', (e) => {
      const opcion = e.target.closest('[data-avatar]');
      if (opcion) return this.elegirAvatar(opcion.dataset.avatar);
      if (e.target.closest('#loginBtn')) return this.ingresar();
      if (e.target.closest('#again')) return this.irAAvatar(null);
      if (e.target.closest('#avatarOk')) return this.confirmarAvatar();
      if (e.target.closest('#volver')) return this.volverANickname();
    });
  }

  /** El botón "Ingresar" solo aparece si el nickname escrito ya está registrado. */
  mostrarIngresar(visible) {
    const boton = this.querySelector('#loginBtn');
    if (boton) boton.hidden = !visible;
  }

  async revisarNickname(valor) {
    const check = validateNickname(valor);
    if (!check.ok) return;
    const consulta = (this._consulta = (this._consulta ?? 0) + 1);
    try {
      const existe = Boolean(await findPlayerByNickname(check.nickname));
      // Si mientras tanto escribió otra cosa, se ignora esta respuesta vieja
      if (consulta === this._consulta && this._paso === 'nick') this.mostrarIngresar(existe);
    } catch {
      /* sin servidor: el botón queda oculto */
    }
  }

  mostrar(texto, tipo = '') {
    const msg = this.querySelector('#regMsg');
    if (!msg) return;
    msg.className = `msg ${tipo}`;
    msg.textContent = texto;
  }

  cargando(texto) {
    const msg = this.querySelector('#regMsg');
    msg.className = 'msg';
    msg.innerHTML = `<span class="spin"></span>${texto}`;
  }

  /** Paso 1, jugador nuevo: verifica que el nickname esté libre y pasa a elegir avatar. */
  async registrar() {
    const boton = this.querySelector('#regBtn');
    const check = validateNickname(this.querySelector('#nick').value);
    if (!check.ok) return this.mostrar(check.error, 'err');
    const nickname = check.nickname.toUpperCase();

    boton.disabled = true;
    this.cargando('Verificando nickname…');
    try {
      // Duplicados: se consulta la API (GET)
      if (await findPlayerByNickname(nickname)) {
        this.mostrar(`El nickname "${nickname}" ya existe. Prueba con otro o usa "Ingresar".`, 'err');
        this.mostrarIngresar(true);
        boton.disabled = false;
        return;
      }
      this.irAAvatar({ nickname, existente: null });
    } catch (error) {
      console.error(error);
      this.mostrar('No se pudo verificar. ¿Está encendido el servidor (npm run server)?', 'err');
      boton.disabled = false;
    }
  }

  /** Paso 1, jugador existente: lo busca y pasa a elegir avatar. */
  async ingresar() {
    const boton = this.querySelector('#loginBtn');
    const check = validateNickname(this.querySelector('#nick').value);
    if (!check.ok) return this.mostrar(check.error, 'err');
    const nickname = check.nickname.toUpperCase();

    boton.disabled = true;
    this.cargando('Buscando jugador…');
    try {
      const existente = await findPlayerByNickname(nickname);
      if (!existente) {
        this.mostrar(`No existe el jugador "${nickname}". Créalo primero.`, 'err');
        boton.disabled = false;
        return;
      }
      this.irAAvatar({ nickname: existente.nickname, existente });
    } catch (error) {
      console.error(error);
      this.mostrar('No se pudo ingresar. ¿Está encendido el servidor (npm run server)?', 'err');
      boton.disabled = false;
    }
  }

  /** Paso 2: confirma el avatar y avisa a gameApp para pasar a elegir cartas. */
  async confirmarAvatar() {
    const pendiente = this._pendiente;
    const avatar = this._avatar;

    // "Continuar como…" o jugador existente: gameApp guarda el avatar si cambió
    if (!pendiente) return emit(this, 'player-continue', { avatar });
    if (pendiente.existente) return emit(this, 'player-continue', { player: pendiente.existente, avatar });

    // Jugador nuevo: se registra con POST ya con su avatar
    const boton = this.querySelector('#avatarOk');
    boton.disabled = true;
    this.cargando('Creando jugador…');
    try {
      // Se vuelve a verificar por si alguien tomó el nickname mientras elegía avatar
      if (await findPlayerByNickname(pendiente.nickname)) {
        this.mostrar(`El nickname "${pendiente.nickname}" ya fue tomado. Vuelve y prueba con otro.`, 'err');
        boton.disabled = false;
        return;
      }
      const guardado = await postPlayer(pendiente.nickname, avatar);
      const player = { ...guardado, avatar: guardado.avatar ?? avatar };
      this.mostrar('¡Registrado!', 'ok');
      emit(this, 'player-registered', { player });
    } catch (error) {
      console.error(error);
      this.mostrar('No se pudo registrar. ¿Está encendido el servidor (npm run server)?', 'err');
      boton.disabled = false;
    }
  }
}

customElements.define('player-register', PlayerRegister);
