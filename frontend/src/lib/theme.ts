/**
 * Sistema de color de Andel — adaptado de Pomopopo (`frontend/src/lib/themes.ts`).
 *
 * REGLA DE ORO: el color elegido SOLO cambia el fondo de la web, NUNCA los
 * botones. `applyTheme` setea únicamente `--brand` / `--brand-dark` en `:root`;
 * `--primary` / `--ring` (tokens Tailwind v4 de `index.css`) quedan intactos y
 * los botones usan siempre el primary original del tema (marrón biblioteca).
 *
 * Qué se porta de Pomopopo y qué no:
 * - SÍ: las 6 paletas brand+dark, `getTheme` con 'custom', `darkenColor` (~35%),
 *   la idea de setear variables en `:root` y un fondo de color cambiable.
 * - NO: el JS vanilla del modal. Andel usa React + panel de ajustes propio.
 *
 * Dónde se aplica al arrancar:
 * - El inicializador al pie de este módulo (guardado con `typeof document`)
 *   corre en la evaluación de imports, ANTES del primer paint de React, así no
 *   hay flash del color anterior. No usa useEffect en App a propósito: el
 *   efecto correría después del primer render.
 * - `index.css` además declara `--brand`/`--brand-dark` por defecto como red
 *   de seguridad (primer paint sin JS o import diferido).
 */

/** Paleta brand (resplandor) + dark (acento con contraste). */
import type { TranslationKey } from "../i18n/LanguageContext";

export interface Theme {
  id: string;
  label: string;
  /** i18n key for the translated swatch name (label stays as ES fallback for non-React use). */
  labelKey: TranslationKey;
  brand: string;
  dark: string;
}

export const THEMES: Theme[] = [
  { id: "arena", label: "Arena", labelKey: "theme.arena", brand: "#D9C6A5", dark: "#8D806B" },
  { id: "red", label: "Rojo", labelKey: "theme.red", brand: "#e44747", dark: "#a83535" },
  { id: "blue", label: "Azul", labelKey: "theme.blue", brand: "#3a7c9e", dark: "#2c5f7a" },
  { id: "green", label: "Verde", labelKey: "theme.green", brand: "#3f8a5c", dark: "#2f6b46" },
  { id: "purple", label: "Violeta", labelKey: "theme.purple", brand: "#7056a6", dark: "#573f8f" },
  { id: "yellow", label: "Ámbar", labelKey: "theme.yellow", brand: "#d09a3e", dark: "#a5772b" },
  { id: "pink", label: "Rosa", labelKey: "theme.pink", brand: "#d05072", dark: "#a83d5c" },
];

export const CUSTOM_THEME_ID = "custom";
export const CUSTOM_LABEL = "Personalizado";
/** Arena neutra: fondo plano por defecto, no compite con la madera. */
export const DEFAULT_THEME_ID = "arena";
export const DEFAULT_CUSTOM_COLOR = "#D9C6A5";

const THEME_KEY = "andel-theme";

export interface PersistedTheme {
  id: string;
  custom: string;
  savedColors: string[];
  /** Ids de presets ocultos con × (como Pomopopo). Ausente = []. */
  hiddenThemes: string[];
}

/** Tope de guardados, como Pomopopo (no deja crecer localStorage sin cota). */
export const MAX_SAVED_COLORS = 12;

const isHexColor = (value: string): boolean =>
  /^#[0-9a-fA-F]{6}$/.test(value);

export function getTheme(id: string, customColor?: string): Theme {
  if (id === CUSTOM_THEME_ID && customColor && isHexColor(customColor)) {
    return {
      id: CUSTOM_THEME_ID,
      label: CUSTOM_LABEL,
      labelKey: "theme.custom",
      brand: customColor,
      dark: darkenColor(customColor),
    };
  }
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Oscurece un hex ~35% (misma fórmula que Pomopopo). Tolera `#rgb`. */
export function darkenColor(hex: string): string {
  let h = hex.replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#000000";
  const r = Math.max(0, Math.floor(parseInt(h.substring(0, 2), 16) * 0.65));
  const g = Math.max(0, Math.floor(parseInt(h.substring(2, 4), 16) * 0.65));
  const b = Math.max(0, Math.floor(parseInt(h.substring(4, 6), 16) * 0.65));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function applyTheme(brand: string, dark: string): void {
  const root = document.documentElement;
  root.style.setProperty("--brand", brand);
  root.style.setProperty("--brand-dark", dark);
  // INTENCIONAL: no se toca --primary / --ring ni ningún token de acento.
  // Los botones vuelven al primary original del tema (index.css).
}

export function loadTheme(): PersistedTheme {
  const fallback: PersistedTheme = {
    id: DEFAULT_THEME_ID,
    custom: DEFAULT_CUSTOM_COLOR,
    savedColors: [],
    hiddenThemes: [],
  };
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedTheme>;
    const known =
      THEMES.some((t) => t.id === parsed.id) || parsed.id === CUSTOM_THEME_ID;
    // Migra guardados viejos: si falta o es inválido, `[]`.
    const savedColors = Array.isArray(parsed.savedColors)
      ? parsed.savedColors
          .filter((c): c is string => typeof c === "string" && isHexColor(c))
          .slice(0, MAX_SAVED_COLORS)
      : [];
    const resolvedId =
      typeof parsed.id === "string" && known ? parsed.id : fallback.id;
    // Ocultos: solo ids de presets conocidos; el activo nunca queda oculto.
    let hiddenThemes = Array.isArray(parsed.hiddenThemes)
      ? parsed.hiddenThemes.filter(
          (t): t is string =>
            typeof t === "string" && THEMES.some((th) => th.id === t)
        )
      : [];
    if (hiddenThemes.includes(resolvedId)) {
      hiddenThemes = hiddenThemes.filter((t) => t !== resolvedId);
    }
    return {
      id: resolvedId,
      custom:
        typeof parsed.custom === "string" && isHexColor(parsed.custom)
          ? parsed.custom
          : fallback.custom,
      savedColors,
      hiddenThemes,
    };
  } catch {
    return fallback;
  }
}

export function saveTheme(next: PersistedTheme): void {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(next));
  } catch {
    // localStorage lleno o bloqueado: el tema igual se aplica en memoria.
  }
}

/** Aplica el tema persistido (o Arena neutra por defecto). */
export function initTheme(): PersistedTheme {
  const persisted = loadTheme();
  const theme = getTheme(persisted.id, persisted.custom);
  applyTheme(theme.brand, theme.dark);
  return persisted;
}

/**
 * Guarda un color en "Mis colores" (como Pomopopo): valida hex, ignora
 * duplicados (insensible a mayúsculas) y respeta el tope de 12.
 * Devuelve la lista actualizada para sincronizar el estado React.
 */
export function addSavedColor(hex: string): string[] {
  const persisted = loadTheme();
  const normalized = hex.toLowerCase();
  if (!isHexColor(normalized)) return persisted.savedColors;
  if (persisted.savedColors.some((c) => c.toLowerCase() === normalized)) {
    return persisted.savedColors;
  }
  const next: PersistedTheme = {
    ...persisted,
    savedColors: [...persisted.savedColors, normalized].slice(
      -MAX_SAVED_COLORS
    ),
  };
  saveTheme(next);
  return next.savedColors;
}

/**
 * Oculta un preset de la lista (como el theme-del de Pomopopo). El activo
 * no se puede quitar; para verlo hay que elegir otro primero. Devuelve la
 * lista actualizada para sincronizar el estado React.
 */
export function hideTheme(id: string): string[] {
  const persisted = loadTheme();
  if (persisted.id === id) return persisted.hiddenThemes;
  if (!THEMES.some((t) => t.id === id)) return persisted.hiddenThemes;
  if (persisted.hiddenThemes.includes(id)) return persisted.hiddenThemes;
  const next: PersistedTheme = {
    ...persisted,
    hiddenThemes: [...persisted.hiddenThemes, id],
  };
  saveTheme(next);
  return next.hiddenThemes;
}

/** Restaura todos los presets ocultos. */
export function restoreThemes(): string[] {
  const persisted = loadTheme();
  const next: PersistedTheme = { ...persisted, hiddenThemes: [] };
  saveTheme(next);
  return next.hiddenThemes;
}

/**
 * Borra un color guardado. NOTA (igual que Pomopopo): si el color borrado
 * era el activo, el color aplicado en memoria/DOM se mantiene hasta la
 * próxima elección — solo se quita de la lista persistida.
 * Devuelve la lista actualizada para sincronizar el estado React.
 */
export function removeSavedColor(hex: string): string[] {
  const persisted = loadTheme();
  const normalized = hex.toLowerCase();
  const next: PersistedTheme = {
    ...persisted,
    savedColors: persisted.savedColors.filter(
      (c) => c.toLowerCase() !== normalized
    ),
  };
  saveTheme(next);
  return next.savedColors;
}

// ---------------------------------------------------------------------------
// Background: flat "color" only (plain matte var(--brand) via BrandBackground).
// Key `andel-bg`. Legacy values ("bosque"/"resplandor") migrate to "color".
// Changes broadcast via event so App re-renders without shared drawer state.
// ---------------------------------------------------------------------------

export type BackgroundMode = "color";

const BG_KEY = "andel-bg";
export const BG_CHANGE_EVENT = "andel:bg-change";

export const BACKGROUND_OPTIONS: {
  id: BackgroundMode;
  label: string;
  description: string;
}[] = [
  {
    id: "color",
    label: "Color",
    description: "Fondo plano del color elegido, estilo Pomopopo.",
  },
];

export function loadBackground(): BackgroundMode {
  // Flat-only mode: legacy stored values ("bosque"/"resplandor") resolve to "color".
  return "color";
}

export function saveBackground(mode: BackgroundMode): void {
  try {
    localStorage.setItem(BG_KEY, mode);
  } catch {
    // Igual se avisa: la vista actual sí cambia aunque no persista.
  }
  window.dispatchEvent(new CustomEvent(BG_CHANGE_EVENT));
}

// Inicializador del módulo: corre al importar, antes del primer paint.
// Evita el flash del tema anterior sin tocar App ni main.tsx.
if (typeof document !== "undefined") {
  initTheme();
}

// ---------------------------------------------------------------------------
// Decoración de fondo con patrones (port de Pomopopo `bg-stars/circles/...`).
// Clave `andel-pattern` (default `none`). El cambio se avisa por evento para
// que App (que renderiza la capa) reaccione, igual que `andel-bg`.
// ---------------------------------------------------------------------------

export type PatternId =
  | "none"
  | "stars"
  | "circles"
  | "triangles"
  | "flowers"
  | "cups"
  | "paws";

const PATTERN_KEY = "andel-pattern";
export const PATTERN_CHANGE_EVENT = "andel:pattern-change";

const PATTERN_IDS: PatternId[] = [
  "none",
  "stars",
  "circles",
  "triangles",
  "flowers",
  "cups",
  "paws",
];

export const PATTERN_OPTIONS: { id: PatternId; label: string; labelKey: TranslationKey }[] = [
  { id: "none", label: "Ninguno", labelKey: "pattern.none" },
  { id: "stars", label: "Estrellas", labelKey: "pattern.stars" },
  { id: "circles", label: "Círculos", labelKey: "pattern.circles" },
  { id: "triangles", label: "Triángulos", labelKey: "pattern.triangles" },
  { id: "flowers", label: "Flores", labelKey: "pattern.flowers" },
  { id: "cups", label: "Tazas", labelKey: "pattern.cups" },
  { id: "paws", label: "Patitas", labelKey: "pattern.paws" },
];

export function loadPattern(): PatternId {
  try {
    const raw = localStorage.getItem(PATTERN_KEY);
    return PATTERN_IDS.includes(raw as PatternId)
      ? (raw as PatternId)
      : "none";
  } catch {
    return "none";
  }
}

export function savePattern(pattern: PatternId): void {
  try {
    localStorage.setItem(PATTERN_KEY, pattern);
  } catch {
    // Igual se avisa: la vista actual sí cambia aunque no persista.
  }
  window.dispatchEvent(new CustomEvent(PATTERN_CHANGE_EVENT));
}
