// =============================================================================
// cardForm.js — Formulario de cartas y ventana modal
// =============================================================================
import { esc } from '../../utils/dom.js';
import { TYPE_NAMES, defaultSounds } from '../../utils/cardTypes.js';

// Formulario compartido por "crear" y "editar", más el helper de ventana modal.

/**
 * Abre una ventana modal dentro de host y devuelve { box, cerrar }.
 * Una "modal" es una ventana que aparece encima del contenido y lo oscurece.
 *   - box:    el recuadro de la ventana (para buscar elementos dentro).
 *   - cerrar: función que quita la ventana.
 */
export function abrirModal(host, html) {
  // Creamos el fondo oscuro (overlay) y metemos el contenido dentro.
  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.innerHTML = `<div class="ovbox modal">${html}</div>`;
  host.appendChild(ov);
  const cerrar = () => ov.remove();
  // Si se hace clic en el fondo (fuera del recuadro), la ventana se cierra.
  ov.addEventListener('mousedown', (e) => {
    if (e.target === ov) cerrar();
  });
  return { box: ov.querySelector('.modal'), cerrar };
}

/**
 * Convierte un texto en un "slug" apto para nombres de archivo.
 * Ej. "Ajiaco Santafereño" → "ajiaco-santafereno"
 *   1) normalize('NFD') separa las letras de sus tildes (é → e + ´).
 *   2) el primer replace borra esas tildes sueltas.
 *   3) pasa a minúsculas, cambia lo que no sea letra/número por "-"
 *      y quita guiones del inicio y del final.
 */
const slug = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Carta vacía con valores por defecto para el formulario de creación. */
export function emptyCard() {
  return {
    name: '',
    type: TYPE_NAMES[0],
    region: '',
    emoji: '🍽️',
    image: '',
    description: '',
    fact: '',
    hp: 250,
    // Crea 4 ataques con daños 20, 30, 40 y 50 e ids attack-01 ... attack-04.
    attacks: [20, 30, 40, 50].map((baseDamage, i) => ({ id: `attack-0${i + 1}`, name: '', baseDamage })),
    defense: { name: '', damageReduction: 0.5 },   // reduce el 50 % del daño
    special: { name: '', baseDamage: 65, unlockTurn: 2, cooldown: 3 },
    sounds: defaultSounds(TYPE_NAMES[0]),
    active: true,
  };
}

// Atajo para crear un campo <input> con su etiqueta. `extra` permite agregar
// atributos como required, type="number", min, max...
const input = (label, name, value, extra = '') =>
  `<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;

/** HTML del formulario completo, prellenado con los datos de la carta. */
export function cardFormHTML(card) {
  // Un par de campos (nombre y daño) por cada uno de los 4 ataques.
  const atk = card.attacks
    .map(
      (a, i) => `<div class="pair">
        ${input(`Ataque ${i + 1}`, `atk${i}_name`, a.name, 'required')}
        ${input('Daño base', `atk${i}_dmg`, a.baseDamage, 'type="number" min="1" max="100" required')}
      </div>`
    )
    .join('');
  return /* html */ `
    <div class="fgrid">
      ${input('Nombre', 'name', card.name, 'required maxlength="30"')}
      <label>Tipo<select name="type">${TYPE_NAMES.map((t) => `<option ${t === card.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${input('Región', 'region', card.region, 'required maxlength="24"')}
      ${input('Emoji (si no hay imagen)', 'emoji', card.emoji ?? '', 'maxlength="4"')}
      ${input('Imagen (ruta)', 'image', card.image, 'placeholder="/images/cards/mi-plato.webp"')}
      ${input('Vida base (HP)', 'hp', card.hp, 'type="number" min="100" max="500" required')}
    </div>
    <label>Descripción breve<textarea name="description" rows="2" required maxlength="140">${esc(card.description)}</textarea></label>
    <label>Dato curioso<textarea name="fact" rows="2" required maxlength="220">${esc(card.fact)}</textarea></label>
    <h4>⚔️ Cuatro ataques</h4>
    <div class="fgrid2">${atk}</div>
    <h4>🛡️ Defensa y ⚡ poder especial</h4>
    <div class="fgrid2">
      <div class="pair">
        ${input('Defensa', 'def_name', card.defense.name, 'required')}
        ${input('Reducción', 'def_red', card.defense.damageReduction, 'type="number" step="0.05" min="0.1" max="0.9"')}
      </div>
      <div class="pair">
        ${input('Poder especial', 'sp_name', card.special.name, 'required')}
        ${input('Daño base', 'sp_dmg', card.special.baseDamage, 'type="number" min="40" max="100" required')}
      </div>
      <div class="pair">
        ${input('Se habilita en el turno', 'sp_unlock', card.special.unlockTurn, 'type="number" min="1" max="5"')}
        ${input('Cooldown (turnos)', 'sp_cd', card.special.cooldown, 'type="number" min="1" max="6"')}
      </div>
    </div>
    <details><summary>🔊 Sonidos</summary>
      <div class="fgrid2">
        ${['attack', 'defense', 'special', 'defeated'].map((k) => input(k, `snd_${k}`, card.sounds?.[k] ?? '')).join('')}
      </div>
    </details>
    <label class="chk"><input type="checkbox" name="active" ${card.active ? 'checked' : ''}> Carta activa (disponible para jugar)</label>`;
}

/**
 * Lee el formulario y arma la carta. Conserva los campos que el formulario no edita
 * (id, createdAt…) tomándolos de `base`. Devuelve { ok, card } o { ok:false, error }.
 */
export function readCardForm(form, base = {}) {
  // FormData lee todos los campos del formulario; f.get('nombre') da el valor de un campo.
  const f = new FormData(form);
  // Atajos: text() lee un campo como texto sin espacios; num() lo lee como número.
  const text = (k) => String(f.get(k) ?? '').trim();
  const num = (k) => Number(f.get(k));

  // Armamos los 4 ataques conservando sus ids originales si existían.
  const attacks = [0, 1, 2, 3].map((i) => ({
    id: base.attacks?.[i]?.id ?? `attack-0${i + 1}`,
    name: text(`atk${i}_name`),
    baseDamage: num(`atk${i}_dmg`),
  }));

  // `...base` copia primero los datos originales; luego los sobrescribimos con
  // lo que viene del formulario. `||` usa el valor de la derecha si el de la
  // izquierda está vacío (por ejemplo, si no se escribió emoji).
  const card = {
    ...base,
    name: text('name'),
    type: text('type'),
    region: text('region'),
    emoji: text('emoji') || '🍽️',
    image: text('image') || `/images/cards/${slug(text('name'))}.webp`,
    description: text('description'),
    fact: text('fact'),
    hp: num('hp'),
    attacks,
    defense: { name: text('def_name'), damageReduction: num('def_red') || 0.5 },
    special: {
      name: text('sp_name'),
      baseDamage: num('sp_dmg'),
      unlockTurn: num('sp_unlock') || 2,
      cooldown: num('sp_cd') || 3,
    },
    sounds: {
      attack: text('snd_attack'),
      defense: text('snd_defense'),
      special: text('snd_special'),
      defeated: text('snd_defeated'),
    },
    active: f.get('active') === 'on', // un checkbox marcado envía el valor 'on'
  };

  // Validaciones de las reglas del juego
  // Si algo no cumple, devolvemos { ok: false, error } y no seguimos.
  // .some() devuelve true si AL MENOS UN elemento cumple la condición.
  if (!card.name || !card.region || !card.description || !card.fact) return { ok: false, error: 'Completa nombre, región, descripción y dato curioso.' };
  if (attacks.some((a) => !a.name)) return { ok: false, error: 'Los cuatro ataques necesitan nombre.' };
  if (!card.defense.name || !card.special.name) return { ok: false, error: 'La defensa y el poder especial necesitan nombre.' };
  if (attacks.some((a) => !Number.isInteger(a.baseDamage) || a.baseDamage < 1 || a.baseDamage > 100)) return { ok: false, error: 'Cada ataque debe hacer entre 1 y 100 de daño base.' };
  // El especial debe superar al ataque más fuerte.
  const maxAttack = Math.max(...attacks.map((a) => a.baseDamage));
  if (!(card.special.baseDamage > maxAttack)) return { ok: false, error: 'El poder especial debe hacer más daño que tus ataques normales.' };
  if (card.special.baseDamage > 100) return { ok: false, error: 'El poder especial no puede pasar de 100 de daño base.' };
  if (!(card.hp >= 100)) return { ok: false, error: 'La vida base debe ser de al menos 100.' };
  return { ok: true, card };
}
