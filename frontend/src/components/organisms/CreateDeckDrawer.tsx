import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

export interface CreateDeckDrawerProps {
  open: boolean;
  onClose: () => void;
  disableClose?: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function CreateDeckDrawer({
  open,
  onClose,
  disableClose = false,
  title = "Crear nuevo libro",
  description = "Subí un PDF y generaremos tarjetas de estudio usando IA.",
  children,
}: CreateDeckDrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Close on Escape (blocked while generating).
  React.useEffect(() => {
    if (!open || disableClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, disableClose, onClose]);

  // Lock body scroll while open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  // Initial focus on the first field.
  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], input, button"
      );
      el?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [open ]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Invisible click-catcher (no darkening): clicking outside the panel
              still closes it, but the library stays fully visible behind. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={() => {
              if (!disableClose) onClose();
            }}
            aria-hidden="true"
            className="absolute inset-0 bg-transparent"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute bottom-4 right-4 top-4 flex w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={disableClose}
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
