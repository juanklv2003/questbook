import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "../atoms/Button"
import { useLanguage } from "../../i18n/LanguageContext"

export interface DeleteCardDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Keeps the dialog mounted with a spinner while the request is in flight. */
  isDeleting?: boolean;
  /** Inline failure copy shown when the delete request rejects. */
  error?: string | null;
  /** Question text preview so the user knows exactly what is being removed. */
  question?: string;
}

export function DeleteCardDialog({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
  error = null,
  question,
}: DeleteCardDialogProps) {
  const { t } = useLanguage();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      // Escape never cancels a request already in flight.
      if (e.key === "Escape" && !isDeleting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isDeleting]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onClick={isDeleting ? undefined : onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-card-title"
        aria-describedby="delete-card-description"
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl"
      >
        <h2 id="delete-card-title" className="text-lg font-bold tracking-tight">
          {t("study.deleteCardTitle")}
        </h2>
        <p id="delete-card-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("study.deleteCardDesc")}
        </p>
        {question && (
          <p className="mt-3 line-clamp-3 break-words rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground">
            {question}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t("study.cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} isLoading={isDeleting}>
            {t("study.deleteCardConfirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
