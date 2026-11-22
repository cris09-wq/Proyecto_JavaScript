import './cardsStyles.css';
import { getCards } from '../../api/cardsApi.js';
import { esc, emit } from '../../utils/dom.js';
import { typeColor } from '../../utils/cardTypes.js';
import { crearCarta } from './createCards.js';
import { editarCartaCompleta, editarCartaParcial } from './editCards.js';
import { eliminarCarta } from './deleteCards.js';

/** Panel de administración: lista las cartas (GET) y conecta crear, editar y eliminar. */
export class CardsAdmin extends HTMLElement {
  constructor() {
    super();
    this.cards = [];
    this.render();
    this.configurarEventos();
  }

  connectedCallback() {
    this.cargar();
  }

  render() {
    this.innerHTML = /* html */ `
      <div class="stepbar">
        <div><div class="eyebrow">ADMINISTRACIÓN</div><h2>Pool de cartas</h2>
        <span class="muted" id="count"></span></div>
        <div class="row"><button class="btn primary" data-action="new">➕ Nueva carta</button>
        <button class="btn" data-action="logout">Cerrar sesión</button></div>
      </div>
      <p class="toast" id="toast" role="status" hidden></p>
      <div id="warn"></div>
      <div id="list"><section class="panel"><span class="spin"></span>Cargando cartas…</section></div>
      <div id="modals"></div>`;
  }

  configurarEventos() {
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      const card = this.cards.find((c) => String(c.id) === id);
      const modals = this.querySelector('#modals');
      const hecho = (texto) => this.recargar(texto);

      if (action === 'new') crearCarta(modals, hecho);
      else if (action === 'edit') editarCartaCompleta(modals, card, hecho);
      else if (action === 'delete') eliminarCarta(modals, card, hecho);
      else if (action === 'logout') emit(this, 'admin-logout');
      else if (action === 'retry') this.cargar();
    });

    // Interruptor "Activa": PATCH de un solo campo
    this.addEventListener('change', async (e) => {
      const sw = e.target.closest('[data-toggle]');
      if (!sw) return;
      const card = this.cards.find((c) => String(c.id) === sw.dataset.toggle);
      sw.disabled = true;
      try {
        await editarCartaParcial(card, { active: sw.checked });
        this.recargar(`✅ PATCH /cards/${card.id} → { active: ${sw.checked} } (solo ese campo).`);
      } catch (error) {
        console.error(error);
        sw.checked = !sw.checked;
        sw.disabled = false;
        this.aviso('❌ No se pudo cambiar el estado.', true);
      }
    });
  }

  aviso(texto, error = false) {
    const toast = this.querySelector('#toast');
    toast.hidden = false;
    toast.className = `toast ${error ? 'err' : ''}`;
    toast.textContent = texto;
  }

  async recargar(texto) {
    await this.cargar();
    if (texto) this.aviso(texto);
  }

  async cargar() {
    const list = this.querySelector('#list');
    try {
      this.cards = await getCards(); // GET
    } catch (error) {
      console.error(error);
      list.innerHTML = `<section class="panel"><p class="msg err">No se pudieron cargar las cartas. ¿Está encendido el servidor?</p><button class="btn" data-action="retry">Reintentar</button></section>`;
      return;
    }
    const activas = this.cards.filter((c) => c.active).length;
    this.querySelector('#count').textContent = `${this.cards.length} cartas · ${activas} activas`;
    this.querySelector('#warn').innerHTML =
      activas < 10 ? `<p class="toast err">⚠️ Hay ${activas} cartas activas. Se necesitan al menos 10 para poder jugar.</p>` : '';
    list.innerHTML = /* html */ `
      <div class="tablewrap"><table class="adm-table">
        <thead><tr><th>#</th><th>Carta</th><th>Tipo</th><th>Región</th><th>HP</th><th>Especial</th><th>Activa</th><th></th></tr></thead>
        <tbody>${this.cards
          .map(
            (c) => `<tr class="${c.active ? '' : 'off'}">
            <td>${esc(c.id)}</td>
            <td><span class="em">${esc(c.emoji || '🍽️')}</span> <b>${esc(c.name)}</b></td>
            <td><span class="badge" style="--c:${typeColor(c.type)}">${esc(c.type)}</span></td>
            <td>${esc(c.region)}</td><td>${c.hp}</td>
            <td>${esc(c.special.name)} (${c.special.baseDamage})</td>
            <td><label class="switch"><input type="checkbox" data-toggle="${esc(c.id)}" ${c.active ? 'checked' : ''} aria-label="Activa"><span></span></label></td>
            <td class="acts2"><button class="btn sm" data-action="edit" data-id="${esc(c.id)}">✏️ Editar</button>
              <button class="btn sm danger" data-action="delete" data-id="${esc(c.id)}">🗑️</button></td>
          </tr>`
          )
          .join('')}</tbody></table></div>`;
  }
}

customElements.define('cards-admin', CardsAdmin);
