import { putCard, patchCard } from '../../api/cardsApi.js';
import { abrirModal, cardFormHTML, readCardForm } from './cardForm.js';

/** PATCH rápido: actualiza SOLO los campos enviados (ej. { active: false }). */
export async function editarCartaParcial(card, data) {
  return patchCard(data, card.id);
}

/** Campos de primer nivel que cambiaron entre la carta original y la editada. */
function cambios(original, editada) {
  const diff = {};
  Object.keys(editada).forEach((k) => {
    if (JSON.stringify(original[k]) !== JSON.stringify(editada[k])) diff[k] = editada[k];
  });
  return diff;
}

/**
 * Editar una carta con DOS botones para ver la diferencia en la práctica:
 *  - PUT   reemplaza el recurso COMPLETO (se envían todos los campos).
 *  - PATCH envía únicamente los campos que cambiaste.
 */
export function editarCartaCompleta(host, card, onDone) {
  const { box, cerrar } = abrirModal(
    host,
    `<h3>✏️ Editar: ${card.name.replace(/</g, '&lt;')}</h3>
     <p class="hint"><b>PUT</b> reemplaza la carta completa (envía todos los campos). <b>PATCH</b> envía solo lo que cambiaste.</p>
     <form id="cardForm" novalidate>${cardFormHTML(card)}
       <p class="msg" id="formMsg" role="status"></p>
       <div class="row end"><button type="button" class="btn" data-close>Cancelar</button>
       <button class="btn" type="submit" data-method="PATCH">Guardar solo cambios (PATCH)</button>
       <button class="btn primary" type="submit" data-method="PUT">Guardar todo (PUT)</button></div></form>`
  );
  box.querySelector('[data-close]').onclick = cerrar;

  const form = box.querySelector('#cardForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const method = e.submitter?.dataset.method ?? 'PUT';
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
      if (method === 'PUT') {
        const nueva = await putCard(result.card, card.id);
        cerrar();
        onDone(`✅ PUT /cards/${card.id} → reemplazada completa (${Object.keys(nueva).length} campos enviados).`);
      } else {
        const diff = cambios(card, result.card);
        if (!Object.keys(diff).length) {
          msg.className = 'msg err';
          msg.textContent = 'No hay cambios que enviar.';
          return;
        }
        await editarCartaParcial(card, diff);
        cerrar();
        onDone(`✅ PATCH /cards/${card.id} → solo se enviaron: ${Object.keys(diff).join(', ')}.`);
      }
    } catch (error) {
      console.error(error);
      msg.className = 'msg err';
      msg.textContent = 'No se pudo guardar.';
    }
  };
}
