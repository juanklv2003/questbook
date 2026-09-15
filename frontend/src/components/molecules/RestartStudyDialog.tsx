import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "../atoms/Button"
import { useLanguage } from "../../i18n/LanguageContext"

export interface RestartStudyDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (opts: { reshuffle: boolean }) => void;
}

/**
 * Presentational restart confirmation. Asks whether to reshuffle the
 * question order before restarting the study session.
 */
export function RestartStudyDialog({ open, onClose, onConfirm }: RestartStudyDialogProps) {
  const { t } = useLanguage();
  const [reshuffle, setReshuffle] = React.useState(true);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // The checkbox resets to ON on every close path so each opening
  // starts checked. Resetting in event handlers (not in an effect)
  // keeps the open path a pure external-system sync (focus + Escape).
  const handleClose = React.useCallback(() => {
    setReshuffle(true);
    onClose();
  }, [onClose]);

  // Focus the safe action first and close on Escape.
  React.useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restart-study-title"
        aria-describedby="restart-study-description"
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl"
      >
        <h2 id="restart-study-title" className="text-lg font-bold tracking-tight">
          {t("study.restartTitle")}
        </h2>
        <p id="restart-study-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("study.restartDesc")}
        </p>
        <div className="mt-4 flex items-center space-x-2">
          <input
            type="checkbox"
            id="restart-reshuffle"
            className="h-4 w-4 rounded border-input focus:ring-ring focus:ring-offset-2"
            checked={reshuffle}
            onChange={(e) => setReshuffle(e.target.checked)}
          />
          <label
            htmlFor="restart-reshuffle"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("study.reshuffle")}
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            {t("study.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm({ reshuffle });
              setReshuffle(true);
            }}
          >
            {t("study.confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
