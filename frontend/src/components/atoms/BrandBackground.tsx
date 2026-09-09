/**
 * BrandBackground — fondo "Color": PLANO mate, sin brillos.
 *
 * El color elegido (vía `var(--brand)`, cambiable en Ajustes) ES el fondo,
 * en plano: sin radial-gradients ni resplandores. Capa `fixed inset-0 z-0
 * pointer-events-none` para no pelear con el layout; el contenido vive
 * en z-10. (Los resplandores viven solo en los modos "bosque"/"resplandor"
 * vía AmbientGlow.)
 */
export function BrandBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundColor: "var(--brand)",
      }}
    />
  );
}
