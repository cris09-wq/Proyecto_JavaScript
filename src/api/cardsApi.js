// =============================================================================
// cardsApi.js — CRUD de cartas (/cards)
// =============================================================================
// CRUD = Create (crear), Read (leer), Update (actualizar), Delete (borrar).
// Cada operación usa un "método HTTP" distinto: POST, GET, PUT/PATCH y DELETE.
import { request, withoutId } from './apiConfig.js';

// GET: consultar y listar
// Devuelve todas las cartas.
export async function getCards() {
  return request('/cards');
}

// Devuelve una sola carta según su id (ej. /cards/7).
export async function getCardById(id) {
  return request(`/cards/${id}`);
}

// POST: crear (el servidor asigna el id)
export async function postCard(card) {
  return request('/cards', {
    method: 'POST',
    body: JSON.stringify({
      // Copiamos todos los datos de la carta, excepto el id.
      ...withoutId(card),
      // Si la carta ya trae fecha de creación la usamos; si no, ponemos la de ahora.
      createdAt: card.createdAt ?? new Date().toISOString(),
    }),
  });
}

// PUT: REEMPLAZA la carta completa. Los campos que no envíes se pierden.
export async function putCard(card, id) {
  return request(`/cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(withoutId(card)),
  });
}

// PATCH: actualiza SOLO los campos enviados (ej. { active: false }).
export async function patchCard(data, id) {
  return request(`/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// DELETE: eliminar
export async function deleteCard(id) {
  return request(`/cards/${id}`, { method: 'DELETE' });
}
