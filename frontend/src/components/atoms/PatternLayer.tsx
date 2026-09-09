import type { CSSProperties } from "react";
import type { PatternId } from "../../lib/theme";

/**
 * PatternLayer — decoración de fondo con patrones, port de Pomopopo
 * (`style.css` líneas ~1015-1094: `::after` fixed con string de glifos,
 * font-size ~36-42px, line-height 15vh, letter-spacing 1vw, word-spacing
 * 8vw, animación twinkle 4s alternate).
 *
 * Diferencias intencionales con Pomopopo:
 * - Pomopopo pinta los glifos con `var(--brand-dark)` sólido sobre fondo
 *   brand (oscuro/saturado). Acá los fondos son claros (beige/bosque), así
 *   que se usa `color-mix(in srgb, var(--brand-dark) 38%, transparent)`:
 *   sutil, decorativo, sin pelear con el contraste AA del contenido.
 * - `cups` (☕) es EXTRA de Andel: Pomopopo no tiene tazas, pero se piden;
 *   usa la misma técnica y métricas que los demás glifos.
 * - `paws` en Pomopopo NO usa glifos sino radial-gradients que dibujan
 *   huellas (ver `PAW_BACKGROUND` abajo, réplica 1:1 de su `bg-paws::after`,
 *   con el color suavizado vía color-mix para legibilidad).
 *
 * Capa `fixed inset-0 z-0 pointer-events-none`: queda sobre los fondos
 * (BrandBackground/AmbientGlow/bosque, también z-0 pero anteriores en el
 * DOM) y debajo del contenido (z-10). `none` no renderiza nada.
 */
export function PatternLayer({ pattern }: { pattern: PatternId }) {
  if (pattern === "none") return null;
  if (pattern === "paws") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={PAW_STYLE}
      />
    );
  }
  const glyph = GLYPH_PATTERNS[pattern];
  if (!glyph) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div style={{ ...GLYPH_BASE_STYLE, fontSize: glyph.fontSize }}>
        {glyph.text}
      </div>
    </div>
  );
}

/** Métricas copiadas de Pomopopo (`bg-stars/circles/triangles/flowers::after`). */
const GLYPH_BASE_STYLE: CSSProperties = {
  lineHeight: "15vh",
  letterSpacing: "1vw",
  wordSpacing: "8vw",
  textAlign: "justify",
  padding: "1vh 0",
  color: "color-mix(in srgb, var(--brand-dark) 38%, transparent)",
  animation: "twinkle 4s ease-in-out infinite alternate",
  userSelect: "none",
};

/** Strings de glifos copiados tal cual de Pomopopo (`style.css`). */
const GLYPH_PATTERNS: Record<
  Exclude<PatternId, "none" | "paws">,
  { text: string; fontSize: number }
> = {
  stars: { text: "✦ ★ ✧    ★        ✧  ★  ✦      ✧       ★   ✦  ✧         ★     ✦   ✧  ★      ✦    ★ ✧         ✦      ★    ✧   ★  ✦     ✧    ★  ✦      ✧   ★  ✦      ✧    ★  ✦   ✧     ★    ✦   ✧  ★    ✦     ✧  ★    ✦   ✧    ★   ✦  ✧     ★   ✦    ✧  ★  ✦    ✧   ★  ✦   ✧    ★  ✦", fontSize: 56 },
  circles: { text: "●  ○     ◉   ○      ●   ◉    ○     ●  ◉      ○    ●   ◉  ○      ●    ◉  ○    ●   ◉     ○   ●  ◉      ○    ●  ◉    ○   ●   ◉    ○  ●   ◉    ○   ●  ◉     ○   ●  ◉    ○   ●  ◉    ○   ●   ◉   ○   ●  ◉     ○   ●  ◉    ○", fontSize: 52 },
  triangles: { text: "△  ◷     △   ◷      △   ◷    △     ◷  △      ◷    △   ◷  △      ◷    △  ◷    △   ◷     △   ◷  △      ◷    △  ◷    △   ◷   △    ◷  △   ◷    △   ◷  △     ◷   △  ◷    △   ◷  △    ◷   △   ◷   △   ◷  △     ◷   △  ◷    △", fontSize: 50 },
  flowers: { text: "✿   ❀      ✿    ❀  ✿     ❀      ✿   ❀  ✿     ❀    ✿  ❀  ✿     ❀    ✿  ❀   ✿  ❀     ✿    ✿  ❀   ✿  ❀    ✿   ❀  ✿    ❀  ✿   ❀    ✿  ❀   ✿    ❀  ✿  ❀    ✿  ❀   ✿    ❀  ✿  ❀    ✿", fontSize: 50 },
  cups: {
    text: "☕   ☕      ☕    ☕  ☕     ☕      ☕   ☕  ☕     ☕    ☕  ☕  ☕     ☕    ☕  ☕   ☕  ☕     ☕    ☕  ☕   ☕  ☕    ☕   ☕  ☕    ☕  ☕   ☕    ☕  ☕   ☕    ☕  ☕  ☕    ☕  ☕   ☕    ☕  ☕  ☕    ☕",
    fontSize: 50,
  },
};

/**
 * Réplica 1:1 del `bg-paws::after` de Pomopopo (dos huellas por tile de
 * 240×180px dibujadas con radial-gradients), con el `var(--brand-dark)`
 * suavizado vía color-mix para fondos claros.
 */
const PAW_COLOR = "color-mix(in srgb, var(--brand-dark) 38%, transparent)";
const PAW_STYLE: CSSProperties = {
  // Capa escalada ×1.35 para huellas más grandes (el tile repite igual).
  transform: "scale(1.35)",
  backgroundImage: [
    `radial-gradient(ellipse 11px 9px at 60px 78px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 5.5px at 42px 60px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 5.5px at 55px 56px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 5.5px at 69px 56px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 5.5px at 82px 60px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(ellipse 9px 7.5px at 180px 148px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 4.5px at 166px 133px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 4.5px at 177px 130px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 4.5px at 188px 131px, ${PAW_COLOR} 98%, transparent 100%)`,
    `radial-gradient(circle 4.5px at 197px 134px, ${PAW_COLOR} 98%, transparent 100%)`,
  ].join(", "),
  backgroundSize: "240px 180px",
  backgroundRepeat: "repeat",
  animation: "twinkle 4s ease-in-out infinite alternate",
};
