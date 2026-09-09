/**
 * MysticForestBackground — decorative CSS-only backdrop (NO photos).
 * A serene mythical forest rendered with pure gradients:
 * deep forest-green base, moonlit glow top-center, a mist band
 * rising from the bottom and a soft vignette to seat the glass panels.
 * Fixed full-bleed at z-0; content must sit at z-10 or above.
 * pointer-events-none + aria-hidden: purely decorative.
 */
export function MysticForestBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Deep forest gradient base */}
      <div className="absolute inset-0 bg-[linear-gradient(165deg,#0E1C14_0%,#1B3324_38%,#2E4A31_68%,#3F5A3B_100%)]" />
      {/* Moonlit glow, top-center */}
      <div className="absolute -top-28 left-1/2 h-[500px] w-[760px] -translate-x-1/2 rounded-full bg-[#D9E6C8]/25 blur-[90px]" />
      {/* Mist veil rising from the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-[50%] bg-[radial-gradient(ellipse_at_50%_115%,rgba(228,238,220,0.30),transparent_68%)] blur-[24px]" />
      {/* Soft light shaft, diagonal */}
      <div className="absolute -left-24 -top-10 h-[80%] w-[55%] rotate-12 bg-[linear-gradient(115deg,transparent_60%,rgba(214,228,205,0.08)_63%,transparent_66%)]" />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_55%,rgba(8,18,12,0.5)_100%)]" />
    </div>
  );
}
