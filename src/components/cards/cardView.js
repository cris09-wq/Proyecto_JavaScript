// =============================================================================
// cardView.js — Cómo se ve una carta (HTML reutilizable)
// =============================================================================
// No es un componente: exporta funciones que devuelven HTML de una carta. Las
// usan el selector de mazo, la batalla y otras pantallas.
import { esc } from '../../utils/dom.js';
import { typeColor } from '../../utils/cardTypes.js';
import { assetUrl } from '../../utils/assets.js';
import './cardsStyles.css';

/**
 * Parte el nombre en 2 líneas equilibradas y elige el tamaño según la línea más larga.
 * Ej. "Bandeja Paisa Grande" → ["Bandeja", "Paisa Grande"] o similar.
 * Devuelve { html, cls } donde cls ('t1'...'t4') define el tamaño de letra.
 */
export function titleParts(name) {
  // .split(' ') separa el texto en palabras.
  const words = String(name).split(' ');
  let best = [String(name)]; // por defecto, todo en una línea
  if (words.length > 1) {
    let min = Infinity; // Infinity = número más grande posible, para que cualquiera sea menor
    // Probamos cortar en cada posición y nos quedamos con el corte más equilibrado.
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '); // primeras i palabras
      const b = words.slice(i).join(' ');    // el resto
      const len = Math.max(a.length, b.length);
      if (len < min) {
        min = len;
        best = [a, b];
      }
    }
  }
  // Largo de la línea más larga. `...` expande el arreglo como argumentos de Math.max.
  const longest = Math.max(...best.map((s) => s.length));
  // Mientras más larga la línea, más pequeña la letra.
  const cls = longest <= 7 ? 't1' : longest <= 9 ? 't2' : longest <= 11 ? 't3' : 't4';
  return { html: best.map(esc).join('<br>'), cls };
}

/** Número de la carta (card-007 → "07"). */
export function cardNumber(card) {
  // .match con una expresión regular busca los dígitos (\d+) al final ($) del id.
  const digits = String(card.id).match(/(\d+)$/);
  // parseInt convierte "007" en 7; padStart(2, '0') lo deja como "07".
  return digits ? String(parseInt(digits[1], 10)).padStart(2, '0') : '★'; // ids sin número (cartas nuevas de la API)
}

/** Barra de habilidades: vida, rango de ataque y poder especial, cada una en su recuadro. */
function statsHTML(card) {
  const danos = card.attacks.map((a) => a.baseDamage);
  // Rango de daño de los ataques, ej. "20–50".
  const ataque = `${Math.min(...danos)}–${Math.max(...danos)}`;
  const detalle = card.attacks.map((a) => `${a.name}: ${a.baseDamage}`).join(' · ');
  // Función pequeña que arma un recuadro de estadística.
  const stat = (cls, icono, valor, etiqueta, title) =>
    `<span class="st ${cls}" title="${esc(title)}"><b><i>${icono}</i>${valor}</b><small>${etiqueta}</small></span>`;
  return `<span class="stats">
      ${stat('hp', '❤️', card.hp, 'Vida', `Vida: ${card.hp}`)}
      ${stat('atk', '⚔️', ataque, 'Ataque', `Ataques — ${detalle}`)}
      ${stat('sp', '⚡', card.special.baseDamage, 'Especial', `${card.special.name}: ${card.special.baseDamage}`)}
    </span>`;
}

/**
 * HTML de una carta estilo baraja.
 * opts: { tag, cls, attr, tick, flipped }
 *  - tag: etiqueta HTML a usar (por defecto 'div'; puede ser 'button').
 *  - cls: clases CSS extra.   attr: atributos extra.   tick: ícono de selección.
 *  - flipped muestra el dato curioso en lugar de la ilustración.
 *  - Si la imagen no carga, bindCardImageFallback() la cambia por el emoji de la carta.
 */
export function cardHTML(card, opts = {}) {
  const tag = opts.tag || 'div';
  const num = cardNumber(card);
  const title = titleParts(card.name);
  const hasImg = Boolean(card.image);
  // Si la carta tiene imagen usamos <img>; si no, su emoji.
  const art = hasImg
    ? `<img class="pic" src="${esc(assetUrl(card.image))}" alt="${esc(card.name)}" data-emoji="${esc(card.emoji || '🍽️')}">`
    : esc(card.emoji || '🍽️');
  // Decoraciones comunes a ambas caras: ondas, números en las esquinas y título.
  const deco = `<span class="wave l"></span><span class="wave r"></span>
      <span class="idx tl"><b>${num}</b><i>♥</i></span><span class="idx br"><b>${num}</b><i>♥</i></span>
      <span class="ttl ${title.cls}">${title.html}</span>`;

  // Cara de la carta: reverso (dato curioso) o frente (imagen + datos + estadísticas).
  const face = opts.flipped
    ? `${deco}
      <span class="bigem">📖</span>
      <span class="cchips" style="top:29%"><em class="rg">📍 ${esc(card.region)}</em></span>
      <span class="fact">${esc(card.fact)}</span>`
    : `${deco}
      <span class="art ${hasImg ? 'has-img' : ''}">${art}<span class="shield">🛡️</span></span>
      <span class="cchips"><em>${esc(card.type)}</em><em class="rg">📍 ${esc(card.region)}</em></span>
      <span class="meta"><span class="dsc">${esc(card.description)}</span></span>
      ${statsHTML(card)}`;

  // La variable CSS --c recibe el color del tipo para pintar la carta.
  return `<${tag} class="card ${opts.cls || ''}" style="--c:${typeColor(card.type)}" ${opts.attr || ''}>
    <span class="cf ${opts.flipped ? '' : 'fr'} ${hasImg && !opts.flipped ? 'im' : ''}">${face}</span>
    <span class="tick">${opts.tick || '✓'}</span>
  </${tag}>`;
}

/**
 * Si una imagen de carta no existe (404), la reemplaza por el emoji de la carta.
 * Los eventos "error" no burbujean, por eso se escucha en fase de captura.
 * (El tercer argumento `true` de addEventListener activa la fase de captura:
 * el evento se escucha mientras "baja" hacia el elemento, antes de llegar a él.)
 */
export function bindCardImageFallback(root) {
  root.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      // instanceof revisa si el objeto es de cierto tipo (aquí, una imagen <img>).
      if (!(img instanceof HTMLImageElement) || !img.classList.contains('pic')) return;
      const art = img.closest('.art');
      if (art) {
        art.classList.remove('has-img');
        art.closest('.cf')?.classList.remove('im');
        art.closest('.cf')?.classList.add('fr');
        // Cambiamos la imagen rota por un texto con el emoji guardado en data-emoji.
        img.replaceWith(document.createTextNode(img.dataset.emoji || '🍽️'));
      }
    },
    true
  );
}
