// =============================================================================
// cards.js — Tabla de administración de cartas <cards-admin>
// =============================================================================
import './cardsStyles.css';
import { getCards } from '../../api/cardsApi.js';
import { esc, emit } from '../../utils/dom.js';
import { typeColor } from '../../utils/cardTypes.js';
// Cada operación del CRUD vive en su propio archivo:
import { crearCarta } from './createCards.js';                              // POST
import { editarCartaCompleta, editarCartaParcial } from './editCards.js';  // PUT y PATCH
import { eliminarCarta } from './deleteCards.js';                          // DELETE

/** Panel de administración: lista las cartas (GET) y conecta crear, editar y eliminar. */
export class CardsAdmin extends HTMLElement {
  constructor() {
    super();
    this.cards = []; // aquí guardamos las cartas que llegan de la API
    this.render();
    this.configurarEventos();
  }

  // connectedCallback es un método especial: el navegador lo llama cuando el
  // componente se agrega a la página. Es buen momento para cargar datos.
  connectedCallback() {
    this.cargar();
  }

  // Estructura: encabezado con botones, aviso (toast), advertencia, lista y modales.
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
    // Todos los botones llevan data-action (y a veces data-id) para saber qué hacer.
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      // dataset reúne todos los atributos data-*: data-action → action, data-id → id.
      const { action, id } = btn.dataset;
      // Buscamos la carta del botón. String() porque el id puede ser número o texto.
      const card = this.cards.find((c) => String(c.id) === id);
      const modals = this.querySelector('#modals');
      // Función que se pasa a crear/editar/eliminar para recargar la lista al terminar.
      const hecho = (texto) => this.recargar(texto);

      if (action === 'new') crearCarta(modals, hecho);
      else if (action === 'edit') editarCartaCompleta(modals, card, hecho);
      else if (action === 'delete') eliminarCarta(modals, card, hecho);
      else if (action === 'logout') emit(this, 'admin-logout');
      else if (action === 'retry') this.cargar();
    });

    // Interruptor "Activa": PATCH de un solo campo
    // El evento 'change' ocurre cuando cambia el valor de un input (aquí, un checkbox).
    this.addEventListener('change', async (e) => {
      const sw = e.target.closest('[data-toggle]');
      if (!sw) return;
      const card = this.cards.find((c) => String(c.id) === sw.dataset.toggle);
      sw.disabled = true;
      try {
        // sw.checked es true si el interruptor quedó encendido.
        await editarCartaParcial(card, { active: sw.checked });
        this.recargar(`✅ PATCH /cards/${card.id} → { active: ${sw.checked} } (solo ese campo).`);
      } catch (error) {
        console.error(error);
        // Si falló, devolvemos el interruptor a como estaba.
        sw.checked = !sw.checked;
        sw.disabled = false;
        this.aviso('❌ No se pudo cambiar el estado.', true);
      }
    });
  }

  // Muestra un mensaje (toast) arriba de la tabla. Si error es true, se ve en rojo.
  aviso(texto, error = false) {
    const toast = this.querySelector('#toast');
    toast.hidden = false;
    toast.className = `toast ${error ? 'err' : ''}`;
    toast.textContent = texto;
  }

  // Vuelve a cargar la lista y luego muestra un mensaje (si se envió uno).
  async recargar(texto) {
    await this.cargar();
    if (texto) this.aviso(texto);
  }

  // Pide las cartas a la API y dibuja la tabla.
  async cargar() {
    const list = this.querySelector('#list');
    try {
      this.cards = await getCards(); // GET
    } catch (error) {
      console.error(error);
      list.innerHTML = `<section class="panel"><p class="msg err">No se pudieron cargar las cartas. ¿Está encendido el servidor?</p><button class="btn" data-action="retry">Reintentar</button></section>`;
      return;
    }
    // Contamos cuántas cartas están activas.
    const activas = this.cards.filter((c) => c.active).length;
    this.querySelector('#count').textContent = `${this.cards.length} cartas · ${activas} activas`;
    // Advertencia si hay menos de 10 activas (no se podría jugar).
    this.querySelector('#warn').innerHTML =
      activas < 10 ? `<p class="toast err">⚠️ Hay ${activas} cartas activas. Se necesitan al menos 10 para poder jugar.</p>` : '';
    // Tabla: una fila <tr> por carta, creada con .map y unida con .join('').
    // Las cartas inactivas llevan la clase "off" (se ven atenuadas).
    // esc() protege los textos que vienen de la API.
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
