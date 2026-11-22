import { putCard, patchCard } from '../../api/cardsApi.js';
import { abrirModal, cardFormHTML, readCardForm } from './cardForm.js';

/** PATCH rápido: actualiza SOLO los campos enviados (ej. { active: false }). */
export async function editarCartaParcial(card, data) {
  return patchCard(data, card.id);
}

/** Editar una carta completa: un solo botón "Guardar" (PUT). */
export function editarCartaCompleta(host, card, onDone) {
  const { box, cerrar } = abrirModal(
    host,
    `<button type="button" class="modal-close" data-close aria-label="Cerrar">✕</button>
     <h3>✏️ Editar: ${card.name.replace(/</g, '&lt;')}</h3>
     <p class="hint">Edita los datos y guarda los cambios.</p>
     <form id="cardForm" novalidate>${cardFormHTML(card)}
       <p class="msg" id="formMsg" role="status"></p>
       <div class="row end"><button class="btn primary" type="submit">💾 Guardar</button></div></form>`
  );
  box.querySelector('[data-close]').onclick = cerrar;

  const form = box.querySelector('#cardForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const msg = box.querySelector('#formMsg');
    const result = readCardForm(form, card);
    if (!result.ok) {
      msg.className = 'msg err';
      msg.textContent = result.error;
      return;
    }
    msg.className = 'msg';
    msg.innerHTML = '<span class="spin"></span>Guardando…';
    try {
      const nueva = await putCard(result.card, card.id);
      cerrar();
      onDone(`✅ PUT /cards/${card.id} → reemplazada completa (${Object.keys(nueva).length} campos enviados).`);
    } catch (error) {
      console.error(error);
      msg.className = 'msg err';
      msg.textContent = 'No se pudo guardar.';
    }
  };
}
