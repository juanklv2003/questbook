/**
 * AmbientGlow — la "decoración del fondo" de Pomopopo, adaptada a Andel.
 *
 * Pomopopo (`style.css` líneas 25-34) pinta el body con `var(--brand)` más DOS
 * radial-gradients ambientales (blanco 8% arriba-izq, negro 12% abajo-der).
 * Acá NO teñimos el fondo completo (el bosque/beige es la identidad de Andel):
 * solo replicamos los DOS resplandores, teñidos con el color elegido vía
 * `color-mix()` + `var(--brand)` / `var(--brand-dark)`.
 *
 * Convivencia con MysticForestBackground:
 * - Ambos son `fixed inset-0 z-0 pointer-events-none`; el contenido vive en z-10.
 * - App renderiza AmbientGlow DESPUÉS del bosque → los glows quedan por encima
 *   de la base del bosque pero debajo del contenido.
 * - En modo "Resplandor" el bosque se oculta y los glows tiñen el fondo beige.
 */
export function AmbientGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundImage: [
          "radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--brand) 26%, transparent), transparent 42%)",
          "radial-gradient(circle at 85% 90%, color-mix(in srgb, var(--brand-dark, var(--brand)) 30%, transparent), transparent 48%)",
        ].join(", "),
      }}
    />
  );
}
