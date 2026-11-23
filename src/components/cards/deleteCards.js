// =============================================================================
// deleteCards.js — Eliminar una carta (DELETE)
// =============================================================================
import { deleteCard } from '../../api/cardsApi.js';
import { abrirModal } from './cardForm.js';
import { esc } from '../../utils/dom.js';

/** DELETE: pide confirmación y elimina la carta. */
export function eliminarCarta(host, card, onDone) {
  // Ventana de confirmación antes de borrar (borrar no se puede deshacer).
  const { box, cerrar } = abrirModal(
    host,
    `<div class="em">🗑️</div><h3>¿Eliminar carta?</h3>
     <p>Se borrará <b>${esc(card.name)}</b> de forma permanente. Si solo quieres sacarla del juego, usa el interruptor "Activa" (PATCH).</p>
     <p class="msg" id="formMsg" role="status"></p>
     <div class="row end"><button class="btn" data-close>Cancelar</button><button class="btn danger" id="yes">Eliminar</button></div>`
  );
  box.querySelector('[data-close]').onclick = cerrar;
  // Botón "Eliminar": borra la carta en la API.
  box.querySelector('#yes').onclick = async () => {
    const msg = box.querySelector('#formMsg');
    msg.innerHTML = '<span class="spin"></span>Eliminando…';
    try {
      await deleteCard(card.id);
      cerrar();
      onDone(`✅ "${card.name}" eliminada.`);
    } catch (error) {
      console.error(error);
      msg.className = 'msg err';
      msg.textContent = 'No se pudo eliminar.';
    }
  };
}
