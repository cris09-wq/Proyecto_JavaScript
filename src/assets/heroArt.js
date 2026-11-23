// =============================================================================
// heroArt.js — Imagen principal ("hero") de la pantalla de inicio
// =============================================================================
import { assetUrl } from '../utils/assets.js';

// Ilustración del hero: mesa con olla tricolor, arepa, empanada, café y plátanos.
// Es un texto con la etiqueta <img>; width/height ayudan al navegador a reservar
// el espacio antes de que cargue, y decoding="async" no bloquea la página.
export const HERO_IMG = `<img class="art" src="${assetUrl('/images/fondo-inicio.webp')}" alt="Mesa con olla humeante tricolor, arepa, empanada, café y plátanos bajo banderines de Colombia" width="2400" height="1792" decoding="async" />`;
