// =============================================================================
// avatars.js — Avatares que puede elegir el jugador
// =============================================================================
import { assetUrl } from '../utils/assets.js';

// Avatares por región natural de Colombia.
// Cada uno tiene 2 imágenes en public/images/avatars/:
//   <id>-cara.webp   → solo la cara (barra de turno durante la batalla)
//   <id>-cuerpo.webp → cuerpo completo (registro, sorteo, victoria/derrota)

// Función "fábrica": recibe datos y devuelve un objeto avatar ya armado.
// Los paréntesis alrededor de { } indican que la flecha devuelve un objeto.
const crear = (id, region, desc) => ({
  id,
  region,
  desc,
  face: assetUrl(`/images/avatars/${id}-cara.webp`),
  body: assetUrl(`/images/avatars/${id}-cuerpo.webp`),
});

// Todos los avatares disponibles, indexados por su id.
export const AVATARS = {
  andina: crear('andina', 'Andina', 'Ruana y sombrero'),
  caribe: crear('caribe', 'Caribe', 'Sombrero vueltiao'),
  pacifica: crear('pacifica', 'Pacífica', 'Turbante y collar'),
  orinoquia: crear('orinoquia', 'Orinoquía', 'Llanero'),
  amazonia: crear('amazonia', 'Amazonía', 'Corona de plumas'),
};

// Lista de ids: ['andina', 'caribe', 'pacifica', 'orinoquia', 'amazonia']
export const AVATAR_IDS = Object.keys(AVATARS);
export const DEFAULT_AVATAR = 'andina';

/** Devuelve el avatar pedido o el predeterminado si no existe. */
export function getAvatar(id) {
  return AVATARS[id] ?? AVATARS[DEFAULT_AVATAR];
}

/**
 * <img> de la cara del avatar.
 * Devuelve un TEXTO con HTML (no un elemento), listo para usarse en innerHTML.
 * `a` es el objeto avatar; `cls` la clase CSS (con valor por defecto).
 */
export const faceImg = (a, cls = 'avatar-face') => `<img class="${cls}" src="${a.face}" alt="Avatar ${a.region}" draggable="false">`;

/** <img> del cuerpo completo del avatar. */
export const bodyImg = (a, cls = 'avatar-body') => `<img class="${cls}" src="${a.body}" alt="Avatar ${a.region}" draggable="false">`;
