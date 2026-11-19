import { assetUrl } from './assets.js';

// Efectos de sonido. Las rutas de cada carta vienen de card.sounds (db.json);
// victoria y derrota son sonidos generales del juego.
export const GAME_SOUNDS = {
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
};

const MUTE_KEY = 'cba:muted';
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* sin localStorage: se queda en falso */
}

export const isMuted = () => muted;

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignorar */
  }
  return muted;
}

/**
 * Reproduce un sonido. Los navegadores solo permiten audio después de un clic del
 * usuario; si el play() es rechazado, simplemente no suena (el juego sigue).
 */
export function playSound(path, volume = 0.7) {
  if (muted || !path) return;
  try {
    const audio = new Audio(assetUrl(path));
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    /* ignorar */
  }
}
