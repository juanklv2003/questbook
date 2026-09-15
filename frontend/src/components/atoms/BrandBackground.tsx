/**
 * BrandBackground — matte "Color" background with bottom-centered ornament.
 *
 * The chosen color (via `var(--brand)`, changeable in Settings) IS the
 * background. Decor-only overlays keep the bottom-center band (below the
 * content card) from reading flat:
 * - a bottom-anchored vertical wash (brand-dark -> transparent),
 * - a faint wide wash across the bottom ~20% for base depth,
 * - a warm brand-dark radial glow centered at 50% 108%,
 * - a neutral light lift centered at 50% 106%.
 * The dark glow alone vanishes on dark-navy brands (dark on dark), and the
 * light lift alone would be a sheen on beige — together one of them always
 * reads, on dark navy AND on default beige. All use `color-mix()` so they
 * adapt to any brand color. Opacities stay low: presence, not spotlight.
 * Layer `fixed inset-0 z-0 pointer-events-none` so it never fights layout;
 * content lives in z-10.
 */
export function BrandBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundColor: "var(--brand)",
      }}
    >
      {/* Bottom-anchored wash: deepens the lower half, fades by mid-screen. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[60%]"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--brand-dark, var(--brand)) 32%, transparent), transparent 100%)",
        }}
      />
      {/* Faint wide wash across the bottom ~20%: base depth on light brands. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[20%]"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--brand-dark, var(--brand)) 20%, transparent), transparent 100%)",
        }}
      />
      {/* Warm brand glow, bottom-center, so the band below the card is never flat. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 108%, color-mix(in srgb, var(--brand-dark, var(--brand)) 34%, transparent), transparent 70%)",
        }}
      />
      {/* Neutral light lift, bottom-center: reads on dark-navy brands where
          dark glows vanish; a soft sheen on beige. Kept faint, not a spotlight. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 32% at 50% 106%, color-mix(in srgb, white 13%, transparent), transparent 70%)",
        }}
      />
    </div>
  );
}
