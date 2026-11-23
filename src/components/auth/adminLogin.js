// =============================================================================
// adminLogin.js — Formulario de inicio de sesión del administrador <admin-login>
// =============================================================================
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

  // Dibuja el formulario. `novalidate` desactiva la validación automática del
  // navegador porque la hacemos nosotros en JavaScript.
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
    // 'submit' ocurre al enviar el formulario (clic en "Entrar" o Enter).
    this.addEventListener('submit', (e) => {
      // Por defecto, enviar un formulario recarga la página. preventDefault() lo evita.
      e.preventDefault();
      this.entrar();
    });
  }

  async entrar() {
    const msg = this.querySelector('#loginMsg');
    // .value es el texto que el usuario escribió en el input.
    const username = this.querySelector('#user').value;
    const password = this.querySelector('#pass').value;
    // Validación: ambos campos son obligatorios.
    if (!username.trim() || !password) {
      msg.className = 'msg err';
      msg.textContent = 'Escribe usuario y contraseña.';
      return;
    }
    const boton = this.querySelector('#loginBtn');
    // Desactivamos el botón para evitar doble clic mientras esperamos al servidor.
    boton.disabled = true;
    msg.className = 'msg';
    msg.innerHTML = '<span class="spin"></span>Validando…';
    try {
      const admin = await loginAdmin(username, password);
      if (!admin) {
        // Credenciales incorrectas.
        msg.className = 'msg err';
        msg.textContent = 'Usuario o contraseña incorrectos.';
        boton.disabled = false;
        return;
      }
      // Login correcto: avisamos a gameApp con un evento.
      emit(this, 'admin-login-success', { admin });
    } catch (error) {
      // Error de conexión (por ejemplo, el servidor está apagado).
      console.error(error);
      msg.className = 'msg err';
      msg.textContent = 'No se pudo validar. ¿Está encendido el servidor?';
      boton.disabled = false;
    }
  }
}

customElements.define('admin-login', AdminLogin);
