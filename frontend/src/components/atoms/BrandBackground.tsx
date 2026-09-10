/**
 * BrandBackground — flat matte "Color" background, no glows.
 *
 * The chosen color (via `var(--brand)`, changeable in Settings) IS the
 * background, flat: no radial-gradients. Layer `fixed inset-0 z-0
 * pointer-events-none` so it never fights layout; content lives in z-10.
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
