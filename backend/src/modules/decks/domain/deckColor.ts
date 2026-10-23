/**
 * Color de un mazo.
 *
 * Antes era un enum cerrado de cinco nombres. Ahora el usuario elige cualquier
 * color en el panel, así que se guarda como hex `#rrggbb`. Los cinco nombres
 * siguen siendo válidos: los libros ya creados los tienen en la base y no se
 * migran (el frontend los resuelve con la misma paleta de siempre).
 */
export const LEGACY_DECK_COLORS = ['primary', 'violet', 'emerald', 'amber', 'rose'] as const;

export type LegacyDeckColor = (typeof LEGACY_DECK_COLORS)[number];

/** `primary` no es un color fijo: sigue el `--primary` del tema. */
export const DEFAULT_DECK_COLOR: LegacyDeckColor = 'primary';

const HEX_COLOR = /^#[0-9a-f]{6}$/;

export function isHexDeckColor(value: string): boolean {
  return HEX_COLOR.test(value.toLowerCase());
}

export function isLegacyDeckColor(value: string): value is LegacyDeckColor {
  return (LEGACY_DECK_COLORS as readonly string[]).includes(value);
}

/**
 * Normaliza el `color` que llega por multipart/JSON.
 *
 * Acepta `#rrggbb` (elegido con el panel) o uno de los cinco nombres históricos.
 * Cualquier otra cosa vuelve a `primary`: el color es decorativo, así que un
 * valor raro no debe tirar abajo la creación del mazo (mismo criterio de antes,
 * que tampoco fallaba con basura).
 */
export function parseDeckColor(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_DECK_COLOR;
  const value = raw.trim().toLowerCase();
  if (!value) return DEFAULT_DECK_COLOR;
  if (isHexDeckColor(value)) return value;
  if (isLegacyDeckColor(value)) return value;
  return DEFAULT_DECK_COLOR;
}
