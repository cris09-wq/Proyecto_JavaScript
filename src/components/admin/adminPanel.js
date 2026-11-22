import '../cards/cards.js';
import '../users/usersAdmin.js';
import './adminStyles.css';

export class AdminPanel extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

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
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      this.querySelectorAll('.atab').forEach((b) => b.classList.toggle('on', b === btn));
      this.querySelector('#adminView').innerHTML =
        btn.dataset.tab === 'productos' ? '<cards-admin></cards-admin>' : '<users-admin></users-admin>';
    });
  }
}

customElements.define('admin-panel', AdminPanel);
