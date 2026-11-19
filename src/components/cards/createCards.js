import { postCard } from '../../api/cardsApi.js';
import { abrirModal, cardFormHTML, emptyCard, readCardForm } from './cardForm.js';

/**
 * POST: abre el formulario y crea una carta nueva.
 * @param {HTMLElement} host      elemento donde se dibuja la ventana
 * @param {(msg:string)=>void} onDone  se llama al terminar con un mensaje de éxito
 */
export function crearCarta(host, onDone) {
  const { box, cerrar } = abrirModal(
    host,
    `<h3>➕ Nueva carta</h3>
     <form id="cardForm" novalidate>${cardFormHTML(emptyCard())}
       <p class="msg" id="formMsg" role="status"></p>
       <div class="row end"><button type="button" class="btn" data-close>Cancelar</button>
       <button class="btn primary" type="submit">Crear (POST)</button></div></form>`
  );
  box.querySelector('[data-close]').onclick = cerrar;

  box.querySelector('#cardForm').onsubmit = async (e) => {
    e.preventDefault();
    const msg = box.querySelector('#formMsg');
    const result = readCardForm(e.target);
    if (!result.ok) {
      msg.className = 'msg err';
      msg.textContent = result.error;
      return;
    }
    msg.className = 'msg';
    msg.innerHTML = '<span class="spin"></span>Creando…';
    try {
      const creada = await postCard(result.card);
      cerrar();
      onDone(`✅ POST /cards → carta "${creada.name}" creada (id ${creada.id}).`);
    } catch (error) {
      console.error(error);
      msg.className = 'msg err';
      msg.textContent = 'No se pudo crear la carta.';
    }
  };
}
