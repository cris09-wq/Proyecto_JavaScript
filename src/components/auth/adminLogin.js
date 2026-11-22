import './authStyles.css';
import { loginAdmin } from '../../api/adminsApi.js';
import { emit } from '../../utils/dom.js';

/** Login administrativo (académico): valida usuario y contraseña consultando la API. */
export class AdminLogin extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="panel login">
        <div class="eyebrow">ZONA PROTEGIDA</div>
        <h2>Administración</h2>
        <p class="muted">Ingresa para gestionar el pool de cartas.</p>
        <form id="loginForm" autocomplete="off" novalidate>
          <label>Usuario<input id="user" name="username" placeholder="admin" required></label>
          <label>Contraseña<input id="pass" name="password" type="password" placeholder="••••••••" required></label>
          <button class="btn primary" id="loginBtn" type="submit">Entrar</button>
        </form>
        <p class="msg" id="loginMsg" role="status"></p>
      </section>`;
  }

  configurarEventos() {
    this.addEventListener('submit', (e) => {
      e.preventDefault();
      this.entrar();
    });
  }

  async entrar() {
    const msg = this.querySelector('#loginMsg');
    const username = this.querySelector('#user').value;
    const password = this.querySelector('#pass').value;
    if (!username.trim() || !password) {
      msg.className = 'msg err';
      msg.textContent = 'Escribe usuario y contraseña.';
      return;
    }
    const boton = this.querySelector('#loginBtn');
    boton.disabled = true;
    msg.className = 'msg';
    msg.innerHTML = '<span class="spin"></span>Validando…';
    try {
      const admin = await loginAdmin(username, password);
      if (!admin) {
        msg.className = 'msg err';
        msg.textContent = 'Usuario o contraseña incorrectos.';
        boton.disabled = false;
        return;
      }
      emit(this, 'admin-login-success', { admin });
    } catch (error) {
      console.error(error);
      msg.className = 'msg err';
      msg.textContent = 'No se pudo validar. ¿Está encendido el servidor?';
      boton.disabled = false;
    }
  }
}

customElements.define('admin-login', AdminLogin);
