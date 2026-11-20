import './authStyles.css';
import { HERO_SVG } from '../../assets/heroArt.js';
import { AVATARS, AVATAR_IDS, DEFAULT_AVATAR, bodyImg } from '../../assets/avatars.js';
import { validateNickname } from '../../utils/validators.js';
import { findPlayerByNickname, postPlayer } from '../../api/playersApi.js';
import { esc, emit } from '../../utils/dom.js';

/** Registro del jugador: nickname obligatorio y único (se valida consultando la API). */
export class PlayerRegister extends HTMLElement {
  constructor() {
    super();
    this._player = null; // jugador guardado en este navegador (para "Continuar como…")
    this._avatar = DEFAULT_AVATAR; // avatar regional elegido
    this.render();
    this.configurarEventos();
  }

  /** gameApp entrega aquí el jugador que ya existe en este navegador. */
  set currentPlayer(player) {
    this._player = player;
    if (player?.avatar && AVATARS[player.avatar]) this._avatar = player.avatar;
    this.render();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="hero">
        <div>
          <div class="eyebrow">BIENVENIDO A</div>
          <h2>Sabores<br>de Colombia</h2>
          <p class="lead">Arma un mazo de 5 platos típicos, junta cartas de la misma región para activar el combo y derrota a la máquina. ¡Que gane el mejor sabor!</p>
          <form id="regForm" autocomplete="off" novalidate>
            <input id="nick" maxlength="16" placeholder="TU NICKNAME" aria-label="Nickname">
            <button class="btn primary" id="regBtn" type="submit">Jugar</button>
          </form>
          <p class="avatar-title">Elige tu avatar por región</p>
          <div class="avatar-picker" role="radiogroup" aria-label="Avatar por región">
            ${AVATAR_IDS.map((id) => this.opcionAvatar(id)).join('')}
          </div>
          <p class="msg" id="regMsg" role="status"></p>
          ${this._player ? `<button class="btn" id="again" type="button">Continuar como <b>${esc(this._player.nickname)}</b></button>` : ''}
        </div>
        ${HERO_SVG}
      </section>`;
  }

  opcionAvatar(id) {
    const a = AVATARS[id];
    const on = id === this._avatar;
    return `<button type="button" class="avatar-opt ${on ? 'on' : ''}" data-avatar="${id}" role="radio" aria-checked="${on}" title="${a.region} · ${a.desc}">
      ${bodyImg(a)}<span>${a.region}</span></button>`;
  }

  /** Marca el avatar elegido sin redibujar todo (así no se borra el nickname escrito). */
  elegirAvatar(id) {
    this._avatar = id;
    this.querySelectorAll('.avatar-opt').forEach((b) => {
      const on = b.dataset.avatar === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
  }

  configurarEventos() {
    // Delegación: sigue funcionando aunque render() reemplace el HTML.
    this.addEventListener('submit', (e) => {
      e.preventDefault();
      this.registrar();
    });
    this.addEventListener('click', (e) => {
      const opcion = e.target.closest('[data-avatar]');
      if (opcion) return this.elegirAvatar(opcion.dataset.avatar);
      if (e.target.closest('#again')) emit(this, 'player-continue', { avatar: this._avatar });
    });
  }

  mostrar(texto, tipo = '') {
    const msg = this.querySelector('#regMsg');
    msg.className = `msg ${tipo}`;
    msg.textContent = texto;
  }

  async registrar() {
    const boton = this.querySelector('#regBtn');
    const check = validateNickname(this.querySelector('#nick').value);
    if (!check.ok) return this.mostrar(check.error, 'err');
    const nickname = check.nickname.toUpperCase();

    boton.disabled = true;
    this.querySelector('#regMsg').className = 'msg';
    this.querySelector('#regMsg').innerHTML = '<span class="spin"></span>Verificando nickname…';
    try {
      // 1) Duplicados: se consulta la API (GET)
      const existente = await findPlayerByNickname(nickname);
      if (existente) {
        this.mostrar(`El nickname "${nickname}" ya existe. Prueba con otro.`, 'err');
        boton.disabled = false;
        return;
      }
      // 2) Nickname nuevo: se registra con POST
      const guardado = await postPlayer(nickname, this._avatar);
      const player = { ...guardado, avatar: guardado.avatar ?? this._avatar };
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
