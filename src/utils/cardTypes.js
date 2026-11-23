// =============================================================================
// cardTypes.js — Tipos de carta, sus colores y sonidos por defecto
// =============================================================================
// Tipos de la temática "comida típica colombiana": color de la carta y sonidos por defecto.

// Objeto "diccionario": la clave es el nombre del tipo y el valor sus datos.
export const CARD_TYPES = {
  Caldo: { color: '#f08a2e' },
  Asado: { color: '#e23b3b' },
  Frito: { color: '#f2c91c' },
  Masa: { color: '#7cc242' },
  Dulce: { color: '#e46bb0' },
  Bebida: { color: '#3f9be8' },
};

// Lista solo con los nombres: ['Caldo', 'Asado', 'Frito', ...]
export const TYPE_NAMES = Object.keys(CARD_TYPES);

// Devuelve el color de un tipo. Si el tipo no existe, usa un gris por defecto.
// CARD_TYPES[type] accede a una propiedad usando una variable como nombre.
export const typeColor = (type) => CARD_TYPES[type]?.color ?? '#9aa0c0';

/** Sonidos por defecto de un tipo (los usa el formulario de creación de cartas). */
export function defaultSounds(type) {
  // Si no hay tipo usamos 'caldo'. Pasamos a minúsculas para armar el nombre del archivo.
  const key = String(type || 'caldo').toLowerCase();
  return {
    attack: `/sounds/attack-${key}.mp3`,   // ej. /sounds/attack-caldo.mp3
    defense: `/sounds/defense-${key}.mp3`,
    special: `/sounds/special-${key}.mp3`,
    defeated: '/sounds/defeated.mp3',      // igual para todos los tipos
  };
}
