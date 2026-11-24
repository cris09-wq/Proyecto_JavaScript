import { byId, request, withoutId } from './apiConfig.js';

// GET: consultar y listar
export async function getCards() {
  return request('/cards');
}

export async function getCardById(id) {
  return request(byId('cards', id));
}

// POST: crear (el servidor asigna el id)
export async function postCard(card) {
  return request('/cards', {
    method: 'POST',
    body: JSON.stringify({
      ...withoutId(card),
      createdAt: card.createdAt ?? new Date().toISOString(),
    }),
  });
}

// PUT: REEMPLAZA la carta completa. Los campos que no envíes se pierden.
export async function putCard(card, id) {
  return request(byId('cards', id), {
    method: 'PUT',
    body: JSON.stringify(withoutId(card)),
  });
}

// PATCH: actualiza SOLO los campos enviados (ej. { active: false }).
export async function patchCard(data, id) {
  return request(byId('cards', id), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// DELETE: eliminar
export async function deleteCard(id) {
  return request(byId('cards', id), { method: 'DELETE' });
}
