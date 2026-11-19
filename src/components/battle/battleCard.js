import { esc } from '../../utils/dom.js';
import { typeColor } from '../../utils/cardTypes.js';
import { isSpecialUnlocked } from '../../utils/battleEngine.js';
import { cardHTML, bindCardImageFallback } from '../cards/cardView.js';

/**
 * Un luchador: carta + barra de vida + estados + mazo restante.
 * battle.js lo dibuja con update(); las animaciones se activan agregando clases
 * (anim-attack, anim-hit…) desde JavaScript.
 */
export class BattleCard extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = '';
  }

  configurarEventos() {
    bindCardImageFallback(this);
  }

  /** Estado del indicador del poder especial. */
  specialTag(cs) {
    const { special } = cs.card;
    if (!isSpecialUnlocked(cs)) return `<span class="tag lock">🔒 Especial: desde su ${special.unlockTurn}.º turno</span>`;
    if (cs.cooldown > 0) return `<span class="tag lock">⏳ Especial: ${cs.cooldown} turno${cs.cooldown > 1 ? 's' : ''}</span>`;
    return `<span class="tag ready">⚡ Especial listo</span>`;
  }

  /**
   * @param {{cs:object, deck:object[], idx:number, who:string}} data
   *   cs = estado de la carta en combate, deck = los 5 estados del mazo.
   */
  update({ cs, deck, idx, who }) {
    const c = cs.card;
    const pct = Math.max(0, Math.round((cs.hp / c.hp) * 100));
    this.style.setProperty('--c', typeColor(c.type));
    this.classList.toggle('defending', cs.isDefending);
    this.innerHTML = /* html */ `
      <div class="fhead"><span class="who">${esc(who)}</span><span>Carta ${Math.min(idx + 1, 5)}/5</span></div>
      ${cardHTML(c, { cls: 'bt' })}
      <div class="hud">
        <div class="row2"><span class="badge">${esc(c.type)}</span><span class="badge rg">📍 ${esc(c.region)}</span></div>
        <div class="hpwrap" role="progressbar" aria-valuemin="0" aria-valuemax="${c.hp}" aria-valuenow="${cs.hp}"><div class="hpbar ${pct < 30 ? 'low' : ''}" style="width:${pct}%"></div></div>
        <div class="hptxt">${cs.hp} / ${c.hp} HP</div>
        <div class="status">
          ${cs.isDefending ? '<span class="tag def">🛡️ Defendiendo</span>' : ''}
          ${cs.hasCombo ? `<span class="tag combo">🔗 Combo ${esc(c.region)} +10%</span>` : ''}
          ${this.specialTag(cs)}
        </div>
        <div class="deckstrip">${deck
          .map((d, i) => `<span class="pip ${i === idx ? 'on' : ''} ${d.hp <= 0 ? 'dead' : ''}" title="${esc(d.card.name)}">${esc(d.card.emoji || '🍽️')}</span>`)
          .join('')}</div>
      </div>`;
  }

  /** Reinicia una clase de animación para poder repetirla. */
  animar(clase, ms) {
    this.classList.remove(clase);
    void this.offsetWidth; // fuerza el reflujo para reiniciar la animación
    this.classList.add(clase);
    setTimeout(() => this.classList.remove(clase), ms);
  }

  /** Número flotante de daño (-34). */
  mostrarDanio(texto, clases = '') {
    const s = document.createElement('span');
    s.className = `dmg ${clases}`;
    s.textContent = texto;
    this.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

customElements.define('battle-card', BattleCard);
