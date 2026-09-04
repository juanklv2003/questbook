import biblioteca from "../../assets/biblioteca.jpg";

/**
 * MysticForestBackground — fixed decorative Galician forest-library backdrop.
 * The artwork is environment-only in the centre (Celtic tracery clearing);
 * painted shelves sit blurred at the far edges, so `object-center` keeps them
 * out of the way — on mobile the cover crop removes them entirely. Our real
 * opaque bookshelf covers the centre, so painted books never compete.
 * The photo renders FULL-BLEED with no scrim or gradient veils (user choice);
 * legibility is handled punctually where text sits on the photo (dashboard
 * header card, footer strip). Content must sit at `z-10` or above; shell
 * wrappers stay transparent. The topbar keeps its own translucency
 * (`bg-background/80`).
 */
export function MysticForestBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <img
        src={biblioteca}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* No scrim or gradients: the scene renders full-bleed by design. */}
    </div>
  );
}
