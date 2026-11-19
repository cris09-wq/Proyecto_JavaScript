import { esc, emit } from '../../utils/dom.js';
import { isSpecialUnlocked, isSpecialReady } from '../../utils/battleEngine.js';

/** Botones de acción del jugador: 4 ataques, defensa y poder especial (con bloqueo y cooldown). */
export class BattleControls extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = '';
  }

  configurarEventos() {
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      const a = btn.dataset.act;
      const action = a === 'def' ? { type: 'defend' } : a === 'sp' ? { type: 'special' } : { type: 'attack', index: Number(a.slice(1)) };
      emit(this, 'battle-action', { action });
    });
  }

  /** @param {{cs:object, enabled:boolean}} data  enabled = es tu turno y puedes actuar */
  update({ cs, enabled }) {
    const c = cs.card;
    const ready = isSpecialReady(cs);
    let nota;
    if (!isSpecialUnlocked(cs)) nota = `🔒 Bloqueado · se habilita en el ${c.special.unlockTurn}.º turno de esta carta`;
    else if (cs.cooldown > 0) nota = `🔒 Bloqueado · faltan ${cs.cooldown} turno${cs.cooldown > 1 ? 's' : ''}`;
    else nota = `Daño ~${c.special.baseDamage}`;

    this.innerHTML = /* html */ `
      <section class="controls">
        <h3>Acciones de ${esc(c.name)}</h3>
        <div class="acts">
          ${c.attacks.map((a, i) => `<button class="act atk" data-act="a${i}" ${enabled ? '' : 'disabled'}>⚔️ ${esc(a.name)}<small>Daño ~${a.baseDamage}</small></button>`).join('')}
          <button class="act def" data-act="def" ${enabled ? '' : 'disabled'}>🛡️ ${esc(c.defense.name)}<small>Reduce ${Math.round(c.defense.damageReduction * 100)} % el próximo golpe · sin daño</small></button>
          <button class="act sp ${ready ? 'ready' : ''}" data-act="sp" ${enabled && ready ? '' : 'disabled'}>⚡ ${esc(c.special.name)}<small>${nota}</small></button>
        </div>
      </section>`;
  }
}

customElements.define('battle-controls', BattleControls);
