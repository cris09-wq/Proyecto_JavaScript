// =============================================================================
// usersAdmin.js — Gestión de jugadores y administradores <users-admin>
// =============================================================================
import './usersStyles.css';
import { getPlayers, postPlayer, deletePlayer } from '../../api/playersApi.js';
import { getAdmins, postAdmin, deleteAdmin } from '../../api/adminsApi.js';
import { emit, esc } from '../../utils/dom.js';
import { abrirModal } from '../cards/cardForm.js';

// Misma clave que usa gameApp.js para guardar la sesión del admin.
const ADMIN_KEY = 'cba:admin';

// Devuelve el admin que tiene la sesión abierta (o null).
const adminActual = () => {
  try {
    return JSON.parse(sessionStorage.getItem(ADMIN_KEY));
  } catch {
    return null;
  }
};

export class UsersAdmin extends HTMLElement {
  constructor() {
    super();
    this.tab = 'players'; // pestaña actual: 'players' (jugadores) o 'admins'
    this.players = [];
    this.admins = [];
    this.render();
    this.configurarEventos();
  }

  connectedCallback() {
    this.cargar();
  }

  // Estructura: encabezado, pestañas, botón "Agregar", aviso, lista y modales.
  render() {
    this.innerHTML = `
      <div class="stepbar">
        <div><div class="eyebrow">ADMINISTRACIÓN</div><h2>Usuarios</h2>
        <span class="muted" id="uCount"></span></div>
        <div class="row"><button class="btn" data-act="logout">Cerrar sesión</button></div>
      </div>
      <div class="utabs">
        <button class="utab ${this.tab === 'players' ? 'on' : ''}" data-utab="players">🧑 Jugadores</button>
        <button class="utab ${this.tab === 'admins' ? 'on' : ''}" data-utab="admins">🛠️ Administradores</button>
        <button class="btn primary" data-act="new">➕ Agregar</button>
      </div>
      <p class="toast" id="uToast" role="status" hidden></p>
      <div id="uList"><section class="panel"><span class="spin"></span>Cargando usuarios…</section></div>
      <div id="uModals"></div>`;
  }

  // Muestra un mensaje arriba de la lista.
  aviso(texto, error = false) {
    const toast = this.querySelector('#uToast');
    toast.hidden = false;
    toast.className = `toast ${error ? 'err' : ''}`;
    toast.textContent = texto;
  }

  async cargar() {
    try {
      // Promise.all hace las dos peticiones AL MISMO TIEMPO y espera a que ambas
      // terminen. El resultado es un arreglo [jugadores, admins] que desestructuramos.
      const [players, admins] = await Promise.all([getPlayers(), getAdmins()]);
      this.players = players;
      this.admins = admins;
      this.pintar();
    } catch (error) {
      console.error(error);
      this.querySelector('#uList').innerHTML = `<section class="panel"><p class="msg err">No se pudieron cargar los usuarios. ¿Está encendido el servidor?</p><button class="btn" data-act="retry">Reintentar</button></section>`;
    }
  }

  // Dibuja la tabla de la pestaña activa.
  pintar() {
    this.querySelector('#uCount').textContent = `${this.players.length} jugadores · ${this.admins.length} administradores`;
    this.querySelectorAll('.utab').forEach((b) => b.classList.toggle('on', b.dataset.utab === this.tab));
    const list = this.querySelector('#uList');
    if (this.tab === 'players') {
      // Tabla de jugadores con sus estadísticas y un botón para eliminar.
      list.innerHTML = `
        <div class="tablewrap"><table class="adm-table">
          <thead><tr><th>ID</th><th>Nickname</th><th>Puntos</th><th>Vict.</th><th>Derrotas</th><th>Partidas</th><th></th></tr></thead>
          <tbody>${this.players
            .map(
              (p) => `<tr>
                <td>${esc(p.id)}</td><td><b>${esc(p.nickname)}</b></td>
                <td>${p.points}</td><td>${p.wins}</td><td>${p.losses}</td><td>${p.gamesPlayed}</td>
                <td class="acts2"><button class="btn sm danger" data-act="delete" data-id="${esc(p.id)}">🗑️</button></td>
              </tr>`
            )
            .join('')}</tbody>
        </table></div>`;
    } else {
      // Tabla de administradores. La contraseña nunca se muestra (••••••).
      // El admin actual no puede borrarse a sí mismo (su botón queda desactivado).
      const yo = adminActual()?.id;
      list.innerHTML = `
        <div class="tablewrap"><table class="adm-table">
          <thead><tr><th>ID</th><th>Usuario</th><th>Contraseña</th><th></th></tr></thead>
          <tbody>${this.admins
            .map(
              (a) => `<tr>
                <td>${esc(a.id)}</td><td><b>${esc(a.username)}</b></td><td>••••••</td>
                <td class="acts2"><button class="btn sm danger" data-act="delete" data-id="${esc(a.id)}" ${String(a.id) === String(yo) ? 'disabled title="No puedes borrar tu propia cuenta"' : ''}>🗑️</button></td>
              </tr>`
            )
            .join('')}</tbody>
        </table></div>`;
    }
  }

  configurarEventos() {
    this.addEventListener('click', (e) => {
      // Cambio de pestaña
      const tab = e.target.closest('[data-utab]');
      if (tab) {
        this.tab = tab.dataset.utab;
        return this.pintar();
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      const id = e.target.closest('[data-id]')?.dataset.id;
      const modals = this.querySelector('#uModals');
      // Al terminar una acción: recargamos y LUEGO (.then) mostramos el mensaje.
      const hecho = (texto) => this.cargar().then(() => this.aviso(texto));
      if (act === 'retry') this.cargar();
      else if (act === 'logout') emit(this, 'admin-logout');
      else if (act === 'new') {
        // "Agregar" abre un formulario distinto según la pestaña.
        if (this.tab === 'players') this.formNuevoJugador(modals, hecho);
        else this.formNuevoAdmin(modals, hecho);
      } else if (act === 'delete') {
        const lista = this.tab === 'players' ? this.players : this.admins;
        const item = lista.find((u) => String(u.id) === id);
        if (item) this.confirmarEliminar(modals, item, hecho);
      }
    });
  }

  // Ventana para crear un jugador nuevo.
  formNuevoJugador(host, onDone) {
    const { box, cerrar } = abrirModal(
      host,
      `<h3>➕ Nuevo jugador</h3>
       <form id="uForm" novalidate>
         <label>Nickname<input name="nickname" maxlength="16" required placeholder="Ej. JCMASTER"></label>
         <p class="msg" id="uMsg"></p>
         <div class="row end"><button type="button" class="btn" data-close>Cancelar</button>
         <button class="btn primary" type="submit">Crear</button></div>
       </form>`
    );
    box.querySelector('[data-close]').onclick = cerrar;
    box.querySelector('#uForm').onsubmit = async (e) => {
      e.preventDefault();
      const msg = box.querySelector('#uMsg');
      const nickname = String(new FormData(e.target).get('nickname') ?? '').trim();
      if (!nickname) {
        msg.className = 'msg err';
        msg.textContent = 'Escribe un nickname.';
        return;
      }
      try {
        // Revisamos que el nickname no exista (sin distinguir mayúsculas).
        const existentes = await getPlayers();
        if (existentes.some((p) => p.nickname.trim().toLowerCase() === nickname.toLowerCase())) {
          msg.className = 'msg err';
          msg.textContent = 'Ese nickname ya existe.';
          return;
        }
        await postPlayer(nickname);
        cerrar();
        onDone(`✅ POST /players → "${nickname}" creado con 0 puntos.`);
      } catch (error) {
        console.error(error);
        msg.className = 'msg err';
        msg.textContent = 'No se pudo crear el jugador.';
      }
    };
  }

  // Ventana para crear un administrador nuevo.
  formNuevoAdmin(host, onDone) {
    const { box, cerrar } = abrirModal(
      host,
      `<h3>➕ Nuevo administrador</h3>
       <form id="uForm" novalidate>
         <label>Usuario<input name="username" required placeholder="Ej. admin2"></label>
         <label>Contraseña<input name="password" required placeholder="Contraseña"></label>
         <p class="msg" id="uMsg"></p>
         <div class="row end"><button type="button" class="btn" data-close>Cancelar</button>
         <button class="btn primary" type="submit">Crear</button></div>
       </form>`
    );
    box.querySelector('[data-close]').onclick = cerrar;
    box.querySelector('#uForm').onsubmit = async (e) => {
      e.preventDefault();
      const msg = box.querySelector('#uMsg');
      const f = new FormData(e.target);
      const username = String(f.get('username') ?? '').trim();
      const password = String(f.get('password') ?? '');
      if (!username || !password) {
        msg.className = 'msg err';
        msg.textContent = 'Completa usuario y contraseña.';
        return;
      }
      try {
        const creado = await postAdmin({ username, password });
        cerrar();
        onDone(`✅ POST /admins → administrador "${creado.username}" creado.`);
      } catch (error) {
        console.error(error);
        msg.className = 'msg err';
        msg.textContent = 'No se pudo crear el administrador.';
      }
    };
  }

  // Ventana de confirmación para eliminar un jugador o un administrador.
  confirmarEliminar(host, item, onDone) {
    const esJugador = this.tab === 'players';
    const nombre = esJugador ? item.nickname : item.username;
    const { box, cerrar } = abrirModal(
      host,
      `<h3>🗑️ Eliminar ${esJugador ? 'jugador' : 'administrador'}</h3>
       <p>Se eliminará <b>${esc(nombre)}</b> de forma permanente.</p>
       <p class="msg" id="uMsg"></p>
       <div class="row end"><button type="button" class="btn" data-close>Cancelar</button>
       <button class="btn danger" id="uYes">Sí, eliminar</button></div>`
    );
    box.querySelector('[data-close]').onclick = cerrar;
    box.querySelector('#uYes').onclick = async () => {
      const msg = box.querySelector('#uMsg');
      try {
        // Llamamos a la función de borrado que corresponda.
        if (esJugador) await deletePlayer(item.id);
        else await deleteAdmin(item.id);
        cerrar();
        onDone(`✅ DELETE /${esJugador ? 'players' : 'admins'}/${item.id} → "${nombre}" eliminado.`);
      } catch (error) {
        console.error(error);
        msg.className = 'msg err';
        msg.textContent = 'No se pudo eliminar.';
      }
    };
  }
}

customElements.define('users-admin', UsersAdmin);
