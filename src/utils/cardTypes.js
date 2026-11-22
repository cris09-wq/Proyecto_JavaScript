// Tipos de la temática "comida típica colombiana": color de la carta y sonidos por defecto.

export const CARD_TYPES = {
  Caldo: { color: '#f08a2e' },
  Asado: { color: '#e23b3b' },
  Frito: { color: '#f2c91c' },
  Masa: { color: '#7cc242' },
  Dulce: { color: '#e46bb0' },
  Bebida: { color: '#3f9be8' },
};

export const TYPE_NAMES = Object.keys(CARD_TYPES);

export const typeColor = (type) => CARD_TYPES[type]?.color ?? '#9aa0c0';

/** Sonidos por defecto de un tipo (los usa el formulario de creación de cartas). */
export function defaultSounds(type) {
  const key = String(type || 'caldo').toLowerCase();
  return {
    attack: `/sounds/attack-${key}.mp3`,
    defense: `/sounds/defense-${key}.mp3`,
    special: `/sounds/special-${key}.mp3`,
    defeated: '/sounds/defeated.mp3',
  };
}
