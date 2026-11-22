import { esc } from '../../utils/dom.js';
import { typeColor } from '../../utils/cardTypes.js';
import { assetUrl } from '../../utils/assets.js';
import './cardsStyles.css';

/** Parte el nombre en 2 líneas equilibradas y elige el tamaño según la línea más larga. */
export function titleParts(name) {
  const words = String(name).split(' ');
  let best = [String(name)];
  if (words.length > 1) {
    let min = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const len = Math.max(a.length, b.length);
      if (len < min) {
        min = len;
        best = [a, b];
      }
    }
  }
  const longest = Math.max(...best.map((s) => s.length));
  const cls = longest <= 7 ? 't1' : longest <= 9 ? 't2' : longest <= 11 ? 't3' : 't4';
  return { html: best.map(esc).join('<br>'), cls };
}

/** Número de la carta (card-007 → "07"). */
export function cardNumber(card) {
  const digits = String(card.id).match(/(\d+)$/);
  return digits ? String(parseInt(digits[1], 10)).padStart(2, '0') : '★'; // ids sin número (cartas nuevas de la API)
}

/** Barra de habilidades: vida, rango de ataque y poder especial, cada una en su recuadro. */
function statsHTML(card) {
  const danos = card.attacks.map((a) => a.baseDamage);
  const ataque = `${Math.min(...danos)}–${Math.max(...danos)}`;
  const detalle = card.attacks.map((a) => `${a.name}: ${a.baseDamage}`).join(' · ');
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
 *  - flipped muestra el dato curioso en lugar de la ilustración.
 *  - Si la imagen no carga, bindCardImageFallback() la cambia por el emoji de la carta.
 */
export function cardHTML(card, opts = {}) {
  const tag = opts.tag || 'div';
  const num = cardNumber(card);
  const title = titleParts(card.name);
  const hasImg = Boolean(card.image);
  const art = hasImg
    ? `<img class="pic" src="${esc(assetUrl(card.image))}" alt="${esc(card.name)}" data-emoji="${esc(card.emoji || '🍽️')}">`
    : esc(card.emoji || '🍽️');
  const deco = `<span class="wave l"></span><span class="wave r"></span>
      <span class="idx tl"><b>${num}</b><i>♥</i></span><span class="idx br"><b>${num}</b><i>♥</i></span>
      <span class="ttl ${title.cls}">${title.html}</span>`;

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

  return `<${tag} class="card ${opts.cls || ''}" style="--c:${typeColor(card.type)}" ${opts.attr || ''}>
    <span class="cf ${opts.flipped ? '' : 'fr'} ${hasImg && !opts.flipped ? 'im' : ''}">${face}</span>
    <span class="tick">${opts.tick || '✓'}</span>
  </${tag}>`;
}

/**
 * Si una imagen de carta no existe (404), la reemplaza por el emoji de la carta.
 * Los eventos "error" no burbujean, por eso se escucha en fase de captura.
 */
export function bindCardImageFallback(root) {
  root.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.classList.contains('pic')) return;
      const art = img.closest('.art');
      if (art) {
        art.classList.remove('has-img');
        art.closest('.cf')?.classList.remove('im');
        art.closest('.cf')?.classList.add('fr');
        img.replaceWith(document.createTextNode(img.dataset.emoji || '🍽️'));
      }
    },
    true
  );
}
