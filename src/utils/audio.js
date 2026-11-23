// =============================================================================
// audio.js — Música de fondo, efectos de sonido y botón de silencio
// =============================================================================
import { assetUrl } from './assets.js';

// Efectos de sonido. Las rutas de cada carta vienen de card.sounds (db.json);
// victoria y derrota son sonidos generales del juego.
export const GAME_SOUNDS = {
  victory: '/sounds/viva-colombia-viva-falcao.mp3',
  defeat: '/sounds/defeat.mp3',
};

// Música de fondo permanente (en bucle). Pon el archivo en public/sounds/musica-fondo.mp3
const MUSIC_PATH = '/sounds/musica-fondo.mp3';
const MUSIC_VOLUME = 0.25; // bajo, para que se escuchen los efectos encima (0 = mudo, 1 = máximo)
let music = null;   // aquí guardaremos el objeto Audio de la música (se crea una sola vez)
let musicFactor = 1; // 1 = volumen normal, 0.5 = mitad (durante la batalla)

// localStorage es un pequeño "almacén" del navegador que guarda texto aunque
// se cierre la página. Lo usamos para recordar si el usuario silenció el juego.
const MUTE_KEY = 'cba:muted'; // nombre (clave) con el que guardamos el dato
let muted = false;            // true = juego en silencio

// try/catch: intentamos ejecutar el código del `try`; si ocurre un error
// (por ejemplo, el navegador bloquea localStorage), saltamos al `catch`
// en vez de que se rompa toda la página.
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* sin localStorage: se queda en falso */
}

// Función flecha que solo devuelve si el juego está en silencio.
export const isMuted = () => muted;

// Activa/desactiva el silencio. Devuelve el nuevo estado.
export function toggleMute() {
  muted = !muted; // `!` invierte un booleano: true → false, false → true
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignorar */
  }
  // Ternario usado como if/else: si quedó en silencio pausamos; si no, reproducimos.
  muted ? pauseMusic() : playMusic();
  return muted;
}

/** Inicia (o reanuda) la música de fondo. Si está en silencio, no hace nada. */
export function playMusic() {
  if (muted) return; // `return` sin valor sale de la función de inmediato
  try {
    // Creamos el reproductor solo la primera vez (si `music` todavía es null).
    if (!music) {
      music = new Audio(assetUrl(MUSIC_PATH));
      music.loop = true; // repetir indefinidamente
    }
    music.volume = MUSIC_VOLUME * musicFactor;
    // play() devuelve una Promesa; si el navegador la rechaza, .catch la ignora.
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
  // Solo cambiamos el volumen si la música ya fue creada.
  if (music) music.volume = MUSIC_VOLUME * musicFactor;
}

// Pausa la música. `music?.pause()` solo llama a pause si `music` no es null.
export function pauseMusic() {
  music?.pause();
}

/**
 * Los navegadores no dejan sonar audio hasta que el usuario interactúa con la página.
 * Por eso la música arranca con el primer clic o tecla, y una sola vez.
 */
export function startMusicOnFirstInteraction() {
  // Función que se ejecuta con el primer clic/tecla...
  const iniciar = () => {
    playMusic();
    // ...y luego se "desuscribe" para no volver a ejecutarse.
    window.removeEventListener('pointerdown', iniciar);
    window.removeEventListener('keydown', iniciar);
  };
  // addEventListener: "cuando ocurra este evento, ejecuta esta función".
  // 'pointerdown' = clic o toque en pantalla; 'keydown' = presionar una tecla.
  window.addEventListener('pointerdown', iniciar);
  window.addEventListener('keydown', iniciar);
}

/**
 * Reproduce un sonido. Los navegadores solo permiten audio después de un clic del
 * usuario; si el play() es rechazado, simplemente no suena (el juego sigue).
 *
 * @param {string} path   Ruta del archivo de sonido.
 * @param {number} volume Volumen entre 0 y 1 (por defecto 0.7).
 */
export function playSound(path, volume = 0.7) {
  // `||` significa "o": si está en silencio O no hay ruta, no hacemos nada.
  if (muted || !path) return;
  try {
    // Cada efecto crea su propio Audio, así pueden sonar varios a la vez.
    const audio = new Audio(assetUrl(path));
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    /* ignorar */
  }
}
