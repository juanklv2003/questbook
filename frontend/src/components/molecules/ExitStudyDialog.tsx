import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "../atoms/Button"
import { useLanguage } from "../../i18n/LanguageContext"

export interface ExitStudyDialogProps {
  open: boolean;
  remaining: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExitStudyDialog({ open, remaining, onClose, onConfirm }: ExitStudyDialogProps) {
  const { t } = useLanguage();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="exit-study-title"
        aria-describedby="exit-study-description"
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl"
      >
        <h2 id="exit-study-title" className="text-lg font-bold tracking-tight">
          {t("study.exitTitle")}
        </h2>
        <p id="exit-study-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("study.exitDesc", { remaining })}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="secondary" onClick={onClose}>
            {t("study.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {t("study.exitLeave")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
