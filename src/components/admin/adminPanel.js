// =============================================================================
// adminPanel.js — Panel de administración <admin-panel>
// =============================================================================
// Tiene dos pestañas: "Productos" (gestionar cartas) y "Usuarios" (gestionar jugadores).
import '../cards/cards.js';      // registra <cards-admin>
import '../users/usersAdmin.js'; // registra <users-admin>
import './adminStyles.css';

export class AdminPanel extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

  // Dibuja las pestañas y, por defecto, muestra la de productos (cartas).
  render() {
    this.innerHTML = `
      <div class="admin-tabs">
        <button class="atab on" data-tab="productos">🍽️ Productos</button>
        <button class="atab" data-tab="usuarios">👥 Usuarios</button>
      </div>
      <div id="adminView"><cards-admin></cards-admin></div>`;
  }

  configurarEventos() {
    this.addEventListener('click', (e) => {
      // ¿Se hizo clic en una pestaña? Si no, no hacemos nada.
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      // querySelectorAll devuelve TODOS los elementos que coinciden.
      // Marcamos con la clase "on" solo la pestaña clicada.
      this.querySelectorAll('.atab').forEach((b) => b.classList.toggle('on', b === btn));
      // Cambiamos el contenido según la pestaña elegida.
      this.querySelector('#adminView').innerHTML =
        btn.dataset.tab === 'productos' ? '<cards-admin></cards-admin>' : '<users-admin></users-admin>';
    });
  }
}

customElements.define('admin-panel', AdminPanel);
