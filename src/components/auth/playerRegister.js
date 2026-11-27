import './authStyles.css';
import { HERO_IMG } from '../../assets/heroArt.js';
import { AVATARS, AVATAR_IDS, DEFAULT_AVATAR, bodyImg } from '../../assets/avatars.js';
import { validateNickname } from '../../utils/validators.js';
import { findPlayerByNickname, postPlayer } from '../../api/playersApi.js';
import { esc, emit } from '../../utils/dom.js';

export class PlayerRegister extends HTMLElement {
  constructor() {
    super();
    this._player = null;
    this._avatar = DEFAULT_AVATAR;
    this._modal = null;
    this.render();
    this.configurarEventos();
  }

  set currentPlayer(player) {
    this._player = player;
    if (player?.avatar && AVATARS[player.avatar]) this._avatar = player.avatar;
    if (!this._modal) this.render();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="hero">
        <div class="hero-text">
          <div class="eyebrow">BIENVENIDO A</div>
          <h2>Sabores<br>de Colombia</h2>
          <p class="lead">Arma un mazo de 5 platos típicos, junta cartas de la misma región para activar el combo y derrota a la máquina. ¡Que gane el mejor sabor!</p>
          <div class="auth-actions">
            <button class="btn primary" id="openLogin" type="button">Ingresar</button>
            <button class="btn ghost" id="openCreate" type="button">Crear usuario</button>
          </div>
          <p class="msg" id="regMsg" role="status"></p>
          ${this._player ? `<button class="btn" id="again" type="button">Continuar como <b>${esc(this._player.nickname)}</b></button>` : ''}
        </div>
        ${HERO_IMG}
      </section>
      <div id="authModal"></div>`;
  }

  abrirModal(tipo) {
    this._modal = tipo;
    this.renderModal();
    this.querySelector('#nick')?.focus();
  }

  cerrarModal() {
    this._modal = null;
    const modal = this.querySelector('#authModal');
    if (modal) modal.innerHTML = '';
  }

  renderModal() {
    const crear = this._modal === 'create';
    const modal = this.querySelector('#authModal');
    if (!modal) return;
    modal.innerHTML = /* html */ `
      <div class="ov auth-ov">
        <section class="panel login auth-login ${crear ? 'crear' : ''}" role="dialog" aria-modal="true" aria-labelledby="authTitle">
          <div class="eyebrow">ACCESO DE JUGADOR</div>
          <h2 id="authTitle">${crear ? 'Crear usuario' : 'Ingresar'}</h2>
          <p class="muted">${crear ? 'Escribe un nickname nuevo y elige tu avatar regional.' : 'Escribe el nickname de un jugador existente.'}</p>
          <form id="authForm" autocomplete="off" novalidate>
            <label>
              Nickname
              <input id="nick" maxlength="16" placeholder="TU NICKNAME" aria-label="Nickname">
            </label>
            ${crear ? `<p class="avatar-title">Elige tu avatar por región</p>
            <div class="avatar-picker" role="radiogroup" aria-label="Avatar por región">
              ${AVATAR_IDS.map((id) => this.opcionAvatar(id)).join('')}
            </div>` : ''}
            <div class="row end">
              <button class="btn" type="button" id="modalCancel">Cancelar</button>
              <button class="btn primary" type="submit">${crear ? 'Crear usuario' : 'Ingresar'}</button>
            </div>
          </form>
          <p class="msg" id="authMsg" role="alert"></p>
        </section>
      </div>`;
  }

  opcionAvatar(id) {
    const a = AVATARS[id];
    const on = id === this._avatar;
    return `<button type="button" class="avatar-opt ${on ? 'on' : ''}" data-avatar="${id}" role="radio" aria-checked="${on}" title="${a.region} · ${a.desc}">
      ${bodyImg(a)}<span>${a.region}</span></button>`;
  }

  elegirAvatar(id) {
    this._avatar = id;
    this.querySelectorAll('.avatar-opt').forEach((b) => {
      const on = b.dataset.avatar === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
  }

  configurarEventos() {
    this.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this._modal === 'create') this.registrar();
      else this.ingresar();
    });
    this.addEventListener('click', (e) => {
      if (e.target.closest('#openLogin')) return this.abrirModal('login');
      if (e.target.closest('#openCreate')) return this.abrirModal('create');
      if (e.target.closest('#modalCancel')) return this.cerrarModal();
      if (e.target.closest('.ov') && !e.target.closest('.auth-login')) return this.cerrarModal();
      const opcion = e.target.closest('[data-avatar]');
      if (opcion) return this.elegirAvatar(opcion.dataset.avatar);
      if (e.target.closest('#again')) return emit(this, 'player-continue', { avatar: this._avatar });
    });
  }

  mostrar(texto, tipo = '') {
    const msg = this.querySelector('#authMsg') ?? this.querySelector('#regMsg');
    if (!msg) return;
    msg.className = `msg ${tipo}`;
    msg.textContent = texto;
  }

  cargando(texto) {
    const msg = this.querySelector('#authMsg') ?? this.querySelector('#regMsg');
    if (!msg) return;
    msg.className = 'msg';
    msg.innerHTML = `<span class="spin"></span>${texto}`;
  }

  async registrar() {
    const boton = this.querySelector('#authForm .btn.primary');
    const check = validateNickname(this.querySelector('#nick').value);
    if (!check.ok) return this.mostrar(check.error, 'err');
    const nickname = check.nickname.toUpperCase();

    boton.disabled = true;
    this.cargando('Verificando nickname…');
    try {
      if (await findPlayerByNickname(nickname)) {
        this.mostrar(`El nickname "${nickname}" ya existe. Prueba con otro o usa "Ingresar".`, 'err');
        boton.disabled = false;
        return;
      }
      this.cargando('Creando jugador…');
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

  async ingresar() {
    const boton = this.querySelector('#authForm .btn.primary');
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
      const avatar = existente.avatar && AVATARS[existente.avatar] ? existente.avatar : this._avatar;
      this._avatar = avatar;
      this.mostrar('¡Bienvenido!', 'ok');
      emit(this, 'player-continue', { player: existente, avatar });
    } catch (error) {
      console.error(error);
      this.mostrar('No se pudo ingresar. ¿Está encendido el servidor (npm run server)?', 'err');
      boton.disabled = false;
    }
  }
}

customElements.define('player-register', PlayerRegister);
