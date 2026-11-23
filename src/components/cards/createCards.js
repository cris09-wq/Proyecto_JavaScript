// =============================================================================
// createCards.js — Crear una carta nueva (POST)
// =============================================================================
import { postCard } from '../../api/cardsApi.js';
import { abrirModal, cardFormHTML, emptyCard, readCardForm } from './cardForm.js';

/**
 * POST: abre el formulario y crea una carta nueva.
 * @param {HTMLElement} host      elemento donde se dibuja la ventana
 * @param {(msg:string)=>void} onDone  se llama al terminar con un mensaje de éxito
 *        (una función que se pasa como parámetro para llamarla después se llama "callback")
 */
export function crearCarta(host, onDone) {
  // Abrimos la ventana modal con el formulario vacío (emptyCard()).
  const { box, cerrar } = abrirModal(
    host,
    `<h3>➕ Nueva carta</h3>
     <form id="cardForm" novalidate>${cardFormHTML(emptyCard())}
       <p class="msg" id="formMsg" role="status"></p>
       <div class="row end"><button type="button" class="btn" data-close>Cancelar</button>
       <button class="btn primary" type="submit">Crear (POST)</button></div></form>`
  );
  // .onclick = función → otra forma de escuchar clics (equivale a addEventListener('click')).
  box.querySelector('[data-close]').onclick = cerrar;

  // Al enviar el formulario...
  box.querySelector('#cardForm').onsubmit = async (e) => {
    e.preventDefault();
    const msg = box.querySelector('#formMsg');
    // 1) Leemos y validamos los datos.
    const result = readCardForm(e.target);
    if (!result.ok) {
      msg.className = 'msg err';
      msg.textContent = result.error;
      return;
    }
    msg.className = 'msg';
    msg.innerHTML = '<span class="spin"></span>Creando…';
    try {
      // 2) Enviamos la carta a la API.
      const creada = await postCard(result.card);
      // 3) Cerramos la ventana y avisamos que terminó.
      cerrar();
      onDone(`✅ POST /cards → carta "${creada.name}" creada (id ${creada.id}).`);
    } catch (error) {
      console.error(error);
      msg.className = 'msg err';
      msg.textContent = 'No se pudo crear la carta.';
    }
  };
}
