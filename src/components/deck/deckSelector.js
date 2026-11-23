// =============================================================================
// deckSelector.js — Elegir y ordenar las cartas del mazo <deck-selector>
// =============================================================================
import './deckStyles.css';
import { getCards } from '../../api/cardsApi.js';
import { validateDeck, hasEnoughActiveCards } from '../../utils/validators.js';
import { getComboRegions, COMBO_BONUS } from '../../utils/battleEngine.js';
import { typeColor } from '../../utils/cardTypes.js';
import { esc, emit } from '../../utils/dom.js';
import { cardHTML, bindCardImageFallback } from '../cards/cardView.js';

// Botones de filtro por tipo de carta. 'todo' muestra todas.
const FILTROS = [
  { id: 'todo', label: 'Todo', emoji: '🃏' },
  { id: 'Caldo', label: 'Caldos', emoji: '🥣' },
  { id: 'Asado', label: 'Asados', emoji: '🍖' },
  { id: 'Frito', label: 'Fritos', emoji: '🍟' },
  { id: 'Masa', label: 'Masas', emoji: '🫓' },
  { id: 'Dulce', label: 'Dulces', emoji: '🍬' },
  { id: 'Bebida', label: 'Bebidas', emoji: '🥤' },
];

/** Paso 1: elegir 5 cartas distintas · Paso 2: definir el orden del mazo. */
export class DeckSelector extends HTMLElement {
  constructor() {
    super();
    this.cards = []; // cartas activas
    this.selected = []; // ids elegidos, en orden de selección
    this.order = []; // ids en el orden de combate
    this.flipped = {}; // cartas que muestran su dato curioso
    this.pickOrder = []; // ids en orden numérico
    this.filtro = 'todo';
    // Pantalla actual: load (cargando) | error | few (pocas cartas) | pick (elegir) | order (ordenar)
    this.step = 'load';
    this.render();
    this.configurarEventos();
    bindCardImageFallback(this);
  }

  // Se ejecuta al agregarse a la página: cargamos las cartas.
  connectedCallback() {
    this.cargar();
  }

  async cargar() {
    this.step = 'load';
    this.render();
    try {
      const todas = await getCards(); // GET
      // Solo se pueden elegir las cartas activas.
      this.cards = todas.filter((c) => c.active);
      // Ordenamos los ids por su número final (card-2 antes que card-10).
      // .sort recibe una función que compara dos elementos: si devuelve un número
      // negativo, `a` va primero; si es positivo, `b` va primero.
      this.pickOrder = this.cards
        .map((c) => c.id)
        .sort((a, b) => {
          const na = Number(String(a).match(/(\d+)$/)?.[1] ?? 0);
          const nb = Number(String(b).match(/(\d+)$/)?.[1] ?? 0);
          // Si los números son iguales (resta = 0), comparamos como texto.
          return na - nb || String(a).localeCompare(String(b));
        });
      this.step = hasEnoughActiveCards(todas) ? 'pick' : 'few';
    } catch (error) {
      console.error(error);
      this.step = 'error';
    }
    this.render();
  }

  // Busca una carta por su id.
  porId(id) {
    return this.cards.find((c) => c.id === id);
  }

  // HTML de la fila de botones de filtro.
  filtrosHTML() {
    return `<div class="filtros" role="group" aria-label="Filtrar cartas">
      ${FILTROS.map((f) => {
        const on = this.filtro === f.id;
        return `<button class="filtro ${on ? 'on' : ''}" data-filter="${esc(f.id)}" aria-pressed="${on}">${f.emoji} ${esc(f.label)}</button>`;
      }).join('')}
    </div>`;
  }

  // Mensaje que indica si el mazo tiene combo regional (2+ cartas de la misma región).
  comboLine(ids) {
    // .filter(Boolean) quita los valores vacíos (undefined) por si algún id no existe.
    const cs = ids.map((id) => this.porId(id)).filter(Boolean);
    const regiones = getComboRegions(cs);
    const pct = Math.round(COMBO_BONUS * 100);
    if (!regiones.length) return '';
    const detalle = regiones.map((r) => `${esc(r)} ×${cs.filter((c) => c.region === r).length}`).join(' · ');
    return `<p class="combo-line on">🔗 Combo activo: ${detalle} (+${pct} % de daño a esas cartas)</p>`;
  }

  // Dibuja la pantalla según el paso actual.
  render() {
    if (this.step === 'load') {
      this.innerHTML = `<section class="panel"><span class="spin"></span>Cargando cartas…</section>`;
    } else if (this.step === 'error') {
      this.innerHTML = `<section class="panel"><p class="msg err">No se pudieron cargar las cartas. ¿Está encendido el servidor (npm run server)?</p><button class="btn" data-act="retry">Reintentar</button></section>`;
    } else if (this.step === 'few') {
      this.innerHTML = `<section class="panel"><h2>Faltan cartas</h2><p class="muted">Se necesitan al menos 10 cartas activas para jugar (hay ${this.cards.length}). Actívalas desde Administración.</p></section>`;
    } else if (this.step === 'pick') {
      this.renderPick();
    } else {
      this.renderOrder();
    }
  }

  // Paso 1: cuadrícula de cartas para elegir.
  renderPick() {
    const lleno = this.selected.length === 5; // ¿ya eligió las 5?
    // Cartas visibles según el filtro elegido.
    const visibles = this.pickOrder
      .map((id) => this.porId(id))
      .filter((c) => c && (this.filtro === 'todo' || c.type === this.filtro));
    // Cada carta es un botón. Si está elegida lleva "sel" y muestra su número de
    // selección; si ya hay 5 elegidas, las demás se ven atenuadas ("dim").
    const grid = visibles
      .map((c) => {
        const sel = this.selected.includes(c.id);
        return `<div class="cw">${cardHTML(c, {
          tag: 'button',
          cls: `${sel ? 'sel ' : ''}${lleno && !sel ? 'dim' : ''}`,
          attr: `data-id="${esc(c.id)}"`,
          tick: sel ? this.selected.indexOf(c.id) + 1 : '✓',
          flipped: Boolean(this.flipped[c.id]),
        })}
          <button class="info" data-info="${esc(c.id)}" aria-label="Ver dato curioso" title="Dato curioso">${this.flipped[c.id] ? '↩' : 'ℹ️'}</button></div>`;
      })
      // Si no hay cartas (texto vacío), `||` muestra el mensaje alternativo.
      .join('') || '<p class="muted">No hay cartas de este tipo.</p>';
    // "Chips" con los nombres de las cartas elegidas hasta ahora.
    const chips =
      this.selected.map((id) => `<span>${esc(this.porId(id).emoji || '🍽️')} ${esc(this.porId(id).name)}</span>`).join('') ||
      '<span class="muted">Aún no has elegido ninguna</span>';

    this.innerHTML = /* html */ `
      <div class="stepbar">
        <div><div class="eyebrow">PASO 1</div><h2>Elige 5 cartas</h2>
        <span class="muted">Sin repetir. La máquina escogerá 5 de las restantes. Toca ℹ️ para leer el dato curioso.</span></div>
        <div class="counter">Seleccionadas <b>${this.selected.length}</b> / 5</div>
      </div>
      <div class="sel-chips">${chips}</div>
      ${this.filtrosHTML()}
      <div class="table"><div class="grid">${grid}</div></div>
      <div class="row end">
        <button class="btn" data-act="clear" ${this.selected.length ? '' : 'disabled'}>Limpiar</button>
        <button class="btn primary" data-act="next" ${lleno ? '' : 'disabled'}>Ordenar mazo →</button>
      </div>`;
  }

  // Paso 2: lista de las 5 cartas con flechas ▲▼ para cambiar el orden.
  renderOrder() {
    const items = this.order
      .map((id, i) => {
        const c = this.porId(id);
        // La primera no puede subir (i === 0) y la última no puede bajar (i === 4).
        return `<div class="oitem" style="--c:${typeColor(c.type)}">
          <div class="pos">${i + 1}</div><div class="em">${esc(c.emoji || '🍽️')}</div>
          <div class="info"><b>${esc(c.name)}</b><small>${esc(c.type)} · 📍 ${esc(c.region)} · Especial: ${esc(c.special.name)}</small></div>
          <div class="mv"><button data-mv="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">▲</button><button data-mv="${i}" data-d="1" ${i === 4 ? 'disabled' : ''} aria-label="Bajar">▼</button></div>
        </div>`;
      })
      .join('');
    this.innerHTML = /* html */ `
      <div class="stepbar"><div><div class="eyebrow">PASO 2</div><h2>Ordena tu mazo</h2>
      <span class="muted">La carta 1 sale primero al combate.</span></div></div>
      ${this.comboLine(this.order)}
      <div class="olist">${items}</div>
      <div class="row between">
        <button class="btn" data-act="back">← Cambiar cartas</button>
        <button class="btn primary" data-act="fight">⚔️ ¡A combatir!</button>
      </div>`;
  }

  configurarEventos() {
    // Un solo listener de clics que revisa qué se clicó, en orden.
    this.addEventListener('click', (e) => {
      // Clic en un filtro
      const filtro = e.target.closest('[data-filter]');
      if (filtro) {
        this.filtro = filtro.dataset.filter;
        return this.render();
      }
      // Mover carta en el orden del mazo
      const mv = e.target.closest('[data-mv]');
      if (mv && !mv.disabled) {
        const i = Number(mv.dataset.mv);      // posición actual
        const j = i + Number(mv.dataset.d);   // nueva posición (-1 sube, +1 baja)
        // Intercambiamos las dos posiciones.
        [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
        return this.render();
      }
      // Voltear carta (dato curioso)
      const info = e.target.closest('[data-info]');
      if (info) {
        const id = info.dataset.info;
        this.flipped[id] = !this.flipped[id];
        this.render();
        this.querySelector(`[data-id="${id}"]`)?.classList.add('flipin'); // animación de giro
        return;
      }
      // Seleccionar / quitar carta
      const carta = e.target.closest('button.card[data-id]');
      if (carta && this.step === 'pick') {
        const id = carta.dataset.id;
        // indexOf da la posición en el arreglo, o -1 si no está.
        const pos = this.selected.indexOf(id);
        // Si ya estaba elegida, la quitamos (.splice borra 1 elemento en `pos`);
        // si no, la agregamos (solo si aún hay espacio).
        if (pos >= 0) this.selected.splice(pos, 1);
        else if (this.selected.length < 5) this.selected.push(id);
        return this.render();
      }
      // Botones con data-act
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'retry') this.cargar();
      else if (act === 'clear') {
        this.selected = [];
        this.render();
      } else if (act === 'next') {
        // Pasamos al paso 2 solo si el mazo es válido.
        const check = validateDeck(this.selected);
        if (!check.ok) return;
        this.order = [...this.selected];
        this.step = 'order';
        this.render();
      } else if (act === 'back') {
        this.step = 'pick';
        this.render();
      } else if (act === 'fight') {
        // Enviamos a gameApp el mazo ordenado y todas las cartas activas (pool).
        emit(this, 'deck-ready', { deck: this.order.map((id) => this.porId(id)), pool: this.cards });
      }
    });
  }
}

customElements.define('deck-selector', DeckSelector);
