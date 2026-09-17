import * as React from "react"
import { createPortal } from "react-dom"
import { Trash2 } from "lucide-react"
import { Button } from "./Button"
import apiClient from "../../lib/axios"
import { getApiErrorMessage } from "../../lib/apiErrorMessage"
import { useLanguage } from "../../i18n/LanguageContext"

export interface DeckDeleteButtonProps {
  deckId: string
  onDeleteSuccess: () => void
  onDeleteError?: (error: Error) => void
}

export function DeckDeleteButton({ deckId, onDeleteSuccess, onDeleteError }: DeckDeleteButtonProps) {
  const { t } = useLanguage();
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const openConfirm = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click
    setConfirmOpen(true);
  };

  // Close on Escape + focus the safe action first.
  React.useEffect(() => {
    if (!confirmOpen) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen, isDeleting]);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true)
      await apiClient.delete(`/decks/${deckId}`)
      setConfirmOpen(false)
      onDeleteSuccess()
    } catch (err: unknown) {
      if (onDeleteError) {
        const errorMessage = getApiErrorMessage(err, t, 'deleteDeck');
        onDeleteError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={openConfirm}
        disabled={isDeleting}
        isLoading={isDeleting}
        aria-label={t("delete.aria")}
      >
        {!isDeleting && <Trash2 className="h-4 w-4" />}
      </Button>

      {confirmOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!isDeleting) setConfirmOpen(false);
            }}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-book-title"
            aria-describedby="delete-book-description"
            className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl"
          >
            <h2 id="delete-book-title" className="text-lg font-bold tracking-tight">
              {t("delete.title")}
            </h2>
            <p id="delete-book-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("delete.description")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                ref={cancelRef}
                type="button"
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
              >
                {t("delete.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirm}
                disabled={isDeleting}
                isLoading={isDeleting}
              >
                {isDeleting ? t("delete.deleting") : t("delete.confirm")}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
