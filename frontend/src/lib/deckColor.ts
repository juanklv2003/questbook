/**
 * Color de los libros.
 *
 * El usuario elige cualquier color con el panel y se guarda como `#rrggbb`. Los
 * cinco nombres históricos (`primary`, `violet`, …) siguen existiendo porque hay
 * libros ya guardados con ellos: se resuelven con la misma paleta de antes, sin
 * migrar ninguna fila.
 */
export const LEGACY_DECK_COLORS = ['primary', 'violet', 'emerald', 'amber', 'rose'] as const;

export type LegacyDeckColor = (typeof LEGACY_DECK_COLORS)[number];

/** `primary` no es un color fijo: sigue el `--primary` del tema. */
export const DEFAULT_DECK_COLOR: LegacyDeckColor = 'primary';

/**
 * Hex concreto de cada nombre histórico. `primary` es `hsl(24 35% 25%)`, el
 * marrón biblioteca del tema: acá hace falta un hex porque el panel de color
 * trabaja en RGB, no con variables CSS.
 */
export const LEGACY_HEX: Record<LegacyDeckColor, string> = {
  primary: '#563b29',
  violet: '#7c3aed',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
};

/** Cómo se pinta cada nombre histórico en la estantería. */
const LEGACY_CSS: Record<LegacyDeckColor, string> = {
  ...LEGACY_HEX,
  // El `primary` histórico sigue al tema (el usuario puede cambiar el acento).
  primary: 'hsl(var(--primary))',
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function isLegacyDeckColor(value: string): value is LegacyDeckColor {
  return (LEGACY_DECK_COLORS as readonly string[]).includes(value);
}

/**
 * Devuelve el color listo para guardar, o `undefined` si no hay uno válido.
 * Acepta hex y nombres históricos; cualquier otra cosa se descarta.
 */
export function normalizeDeckColor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim().toLowerCase();
  if (!value) return undefined;
  if (isHexColor(value)) return value;
  if (isLegacyDeckColor(value)) return value;
  return undefined;
}

/** Color CSS con el que se pinta el lomo. Cae al `primary` del tema. */
export function resolveDeckColor(value?: string | null): string {
  const normalized = normalizeDeckColor(value);
  if (!normalized) return LEGACY_CSS[DEFAULT_DECK_COLOR];
  if (isHexColor(normalized)) return normalized;
  return LEGACY_CSS[normalized as LegacyDeckColor];
}

/** Hex de trabajo para el panel: los nombres históricos tienen un hex fijo. */
export function pickerHex(value?: string | null): string {
  const normalized = normalizeDeckColor(value);
  if (!normalized) return LEGACY_HEX[DEFAULT_DECK_COLOR];
  if (isHexColor(normalized)) return normalized;
  return LEGACY_HEX[normalized as LegacyDeckColor];
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsv {
  /** 0–359. Decimal: redondear acá rompe el round-trip hex → hsv → hex. */
  h: number;
  /** 0–100. */
  s: number;
  /** 0–100. */
  v: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  // Sin redondear: `hexToHsv` tiene que ser la inversa exacta de `hsvToHex`.
  // Redondear acá movía hasta 1 unidad por canal (`#7c3aed` volvía `#7b39ed`),
  // porque el error de `h`/`s`/`v` se multiplica por 255 al volver a RGB.
  // El redondeo para mostrar vive en la UI, no en el cálculo.
  return {
    h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = vn - c;

  const [r1, g1, b1] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function hexToHsv(hex: string): Hsv {
  return rgbToHsv(hexToRgb(hex));
}

export function hsvToHex(hsv: Hsv): string {
  const { r, g, b } = hsvToRgb(hsv);
  return rgbToHex(r, g, b);
}

/** Hex legible para mostrar al usuario (siempre `#rrggbb` en minúsculas). */
export function formatDeckColorHex(value?: string | null): string {
  return pickerHex(value).toLowerCase();
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * ¿El lomo pide texto negro? Se compara el contraste WCAG real: mientras el
 * blanco aguante 3:1 (AA para texto grande) se mantiene el blanco de siempre;
 * por debajo, el color es claro y el título pasa a negro.
 *
 * Así los cinco presets históricos conservan su look (el más flojo es ámbar con
 * 3.19:1) y sólo los colores claros —beige, amarillo, celeste— cambian.
 *
 * Los nombres históricos se resuelven con su hex fijo (`LEGACY_HEX`), incluido
 * `primary`, que es el mismo marrón que `hsl(var(--primary))` del tema.
 */
export function deckColorPrefersDarkText(value?: string | null): boolean {
  const normalized = normalizeDeckColor(value);
  const hex = !normalized
    ? LEGACY_HEX[DEFAULT_DECK_COLOR]
    : isHexColor(normalized)
      ? normalized
      : LEGACY_HEX[normalized as LegacyDeckColor];
  const luminance = relativeLuminance(hexToRgb(hex));
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite < 3 && contrastWithBlack > contrastWithWhite;
}
