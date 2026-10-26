/**
 * Colores de libro que el usuario guarda a mano desde el selector.
 *
 * Se persisten en `localStorage` y no en el backend: es una preferencia de la
 * interfaz (igual que los colores guardados del fondo en `lib/theme.ts`), así
 * que no hace falta tabla, migración ni endpoint nuevo.
 */
const STORAGE_KEY = "questbook-deck-colors";

/** Tope de colores guardados: no deja crecer localStorage sin cota. */
export const MAX_SAVED_DECK_COLORS = 12;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

/**
 * Lista persistida: sólo hex, en minúsculas, sin duplicados y recortada al
 * tope. Un valor corrupto en localStorage devuelve la lista vacía en vez de
 * romper el selector.
 */
export function readSavedDeckColors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique: string[] = [];
    for (const item of parsed) {
      if (!isHex(item)) continue;
      const hex = item.toLowerCase();
      if (unique.includes(hex)) continue;
      unique.push(hex);
    }
    return unique.slice(-MAX_SAVED_DECK_COLORS);
  } catch {
    return [];
  }
}

function writeSavedDeckColors(colors: string[]): string[] {
  if (typeof window === "undefined") return colors;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // Modo privado o cuota llena: la lista vive sólo en memoria hasta recargar.
  }
  return colors;
}

/**
 * Guarda un color. Ignora lo que no sea hex y los duplicados, y al llegar al
 * tope tira el más viejo. Devuelve la lista actualizada para el estado React.
 */
export function addSavedDeckColor(raw: string): string[] {
  const current = readSavedDeckColors();
  if (!isHex(raw)) return current;
  const hex = raw.toLowerCase();
  if (current.includes(hex)) return current;
  return writeSavedDeckColors([...current, hex].slice(-MAX_SAVED_DECK_COLORS));
}

/**
 * Borra un color guardado. No toca el color elegido para el mazo: si era el
 * activo, el libro se sigue creando con él hasta que el usuario elija otro.
 */
export function removeSavedDeckColor(raw: string): string[] {
  const current = readSavedDeckColors();
  if (!isHex(raw)) return current;
  const hex = raw.toLowerCase();
  return writeSavedDeckColors(current.filter((color) => color !== hex));
}
