import { assetUrl } from './assets.js';

// Efectos de sonido. Las rutas de cada carta vienen de card.sounds (db.json);
// victoria y derrota son sonidos generales del juego.
export const GAME_SOUNDS = {
  victory: '/sounds/viva-colombia-viva-falcao.mp3',
  defeat: '/sounds/defeat.mp3',
};

// Música de fondo permanente (en bucle). Pon el archivo en public/sounds/musica-fondo.mp3
const MUSIC_PATH = '/sounds/musica-fondo.mp3';
const MUSIC_VOLUME = 0.25; // bajo, para que se escuchen los efectos encima
let music = null;
let musicFactor = 1; // 1 = volumen normal, 0.5 = mitad (durante la batalla)

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
  muted ? pauseMusic() : playMusic();
  return muted;
}

/** Inicia (o reanuda) la música de fondo. Si está en silencio, no hace nada. */
export function playMusic() {
  if (muted) return;
  try {
    if (!music) {
      music = new Audio(assetUrl(MUSIC_PATH));
      music.loop = true;
    }
    music.volume = MUSIC_VOLUME * musicFactor;
    music.play().catch(() => {}); // el navegador puede bloquearlo hasta el primer clic
  } catch {
    /* ignorar */
  }
}

/**
 * Ajusta el volumen de la música como proporción del volumen normal.
 * setMusicVolume(0.5) → mitad (al iniciar la partida); setMusicVolume(1) → normal.
 */
export function setMusicVolume(factor) {
  musicFactor = factor;
  if (music) music.volume = MUSIC_VOLUME * musicFactor;
}

export function pauseMusic() {
  music?.pause();
}

/**
 * Los navegadores no dejan sonar audio hasta que el usuario interactúa con la página.
 * Por eso la música arranca con el primer clic o tecla, y una sola vez.
 */
export function startMusicOnFirstInteraction() {
  const iniciar = () => {
    playMusic();
    window.removeEventListener('pointerdown', iniciar);
    window.removeEventListener('keydown', iniciar);
  };
  window.addEventListener('pointerdown', iniciar);
  window.addEventListener('keydown', iniciar);
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
