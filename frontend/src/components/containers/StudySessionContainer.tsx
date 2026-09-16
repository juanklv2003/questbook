import * as React from "react"
import { createPortal } from "react-dom"
import { useFlashcardStudy } from "../../hooks/useFlashcardStudy"
import { useDeckFlashcards } from "../../hooks/useDeckFlashcards"
import { StudyPlayer } from "../organisms/StudyPlayer"
import { RestartStudyDialog } from "../molecules/RestartStudyDialog"
import type { Flashcard } from "../../types"
import type { ReviewListItem } from "../molecules/StudyReviewList"
import { Loader2, AlertCircle, ArrowLeft, RotateCcw, WifiOff } from "lucide-react"
import { Button } from "../atoms/Button"
import { useLanguage } from "../../i18n/LanguageContext"

export function StudySessionContainer({ deckId, onBack }: { deckId: string, onBack: () => void }) {
  const { flashcards, isLoading, error } = useDeckFlashcards(deckId);
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("study.loading")}</p>
      </div>
    );
  }

  if (error || !flashcards.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <p className="text-muted-foreground">{error || t("study.empty")}</p>
        <Button variant="outline" onClick={onBack}>{t("study.back")}</Button>
      </div>
    );
  }

  return <StudySessionInner key={deckId} deckId={deckId} flashcards={flashcards} onBack={onBack} />;
}

function StudySessionInner({ deckId, flashcards, onBack }: { deckId: string, flashcards: Flashcard[], onBack: () => void }) {
  const { t } = useLanguage();
  const [restartOpen, setRestartOpen] = React.useState(false);
  const {
    tarjetaActual,
    orderedTarjetas,
    currentIndex,
    progreso,
    total,
    haTerminado,
    respuestaUsuario,
    setRespuestaUsuario,
    evaluarRespuesta,
    isEvaluating,
    feedbackIA,
    evaluationError,
    quotaExceeded,
    overloaded,
    clearEvaluationError,
    siguienteTarjeta,
    reintentar,
    resultsById,
    goToCard,
    pendingResume,
    resumeProgress,
    restart,
    answeredCount,
    remainingCount,
    isOffline,
    sessionError
  } = useFlashcardStudy(deckId, flashcards);

  const handleBack = () => {
    if (isEvaluating) return;
    if (!haTerminado && answeredCount > 0) {
      const ok = window.confirm(t("study.exitConfirm", { remaining: remainingCount }));
      if (!ok) return;
    }
    onBack();
  };

  const handleRestart = () => {
    if (isEvaluating) return;
    setRestartOpen(true);
  };

  const handleConfirmRestart = ({ reshuffle }: { reshuffle: boolean }) => {
    setRestartOpen(false);
    void restart({ reshuffle });
  };

  if (haTerminado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in zoom-in-95">
        <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{t("study.finishedTitle")}</h2>
        <p className="text-muted-foreground max-w-md">
          {t("study.finishedDesc", { total })}
        </p>
        <p className="text-xs text-muted-foreground max-w-md">
          {t("study.finishedKept")}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Button variant="outline" size="lg" onClick={handleRestart}>
            <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            {t("study.restart")}
          </Button>
          <Button onClick={onBack} size="lg">
            {t("study.backToPanel")}
          </Button>
        </div>
        <RestartStudyDialog
          open={restartOpen}
          onClose={() => setRestartOpen(false)}
          onConfirm={handleConfirmRestart}
        />
      </div>
    );
  }

  // Sin visor de PDF: la columna izquierda es la lista de preguntas
  // (StudyPlayer la pinta como aside) y la derecha la tarjeta activa.

  // Lista de repaso en el orden activo de la sesión (respeta reshuffle):
  // estado por tarjeta desde el historial del hook (clave por id).
  const reviewItems: ReviewListItem[] = orderedTarjetas.map((f) => ({
    id: f.id,
    question: f.question,
    status:
      resultsById[f.id] === true
        ? "correct"
        : resultsById[f.id] === false
          ? "incorrect"
          : "pending",
  }));

  return (
    <div className="relative w-full flex flex-col gap-2 pt-2 sm:pt-3">
      {(isOffline || sessionError) && !pendingResume && createPortal(
        <div
          role="status"
          className="pointer-events-none fixed left-1/2 top-20 z-[45] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
        >
          <p className="flex items-center justify-center gap-2 rounded-full border bg-card/95 px-4 py-2 text-center text-xs text-muted-foreground shadow-lg backdrop-blur">
            {isOffline ? (
              <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {isOffline ? t("study.sessionOffline") : t("study.sessionError")}
          </p>
        </div>,
        document.body
      )}
      <div className="w-full flex justify-start">
        <Button variant="ghost" size="sm" onClick={handleBack} disabled={isEvaluating} className="text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("study.back")}
        </Button>
      </div>

      {/* Floating resume toast: portalled to document.body so it escapes the
          content wrapper's stacking context (relative z-10) and paints above
          the navbar (z-40); top-20 clears the floating navbar (top-3 + h-14).
          z-[45] stays below drawers (z-50) and modals (z-[60]). Fixed overlay,
          reserves no layout height (same pattern as offline pill). */}
      {pendingResume && createPortal(
        <div
          role="alert"
          className="pointer-events-none fixed left-1/2 top-20 z-[45] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
        >
          <div className="pointer-events-auto flex flex-col gap-3 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted-foreground">
              {t("study.resumePrompt", { current: pendingResume.current, total: pendingResume.total })}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={resumeProgress} className="pointer-events-auto">
                {t("study.resumeYes", { current: pendingResume.current, total: pendingResume.total })}
              </Button>
              <Button size="sm" variant="outline" onClick={handleRestart} className="pointer-events-auto">
                {t("study.restart")}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="w-full">
        <StudyPlayer
          card={tarjetaActual}
          progress={progreso}
          total={total}
          userAnswer={respuestaUsuario}
          setUserAnswer={setRespuestaUsuario}
          onSubmit={evaluarRespuesta}
          isEvaluating={isEvaluating}
          evaluation={feedbackIA}
          onNext={siguienteTarjeta}
          onRetry={reintentar}
          error={evaluationError}
          quotaExceeded={quotaExceeded}
          overloaded={overloaded}
          onAcknowledgeQuota={clearEvaluationError}
          reviewItems={reviewItems}
          activeIndex={currentIndex}
          onSelectCard={goToCard}
          onRestart={handleRestart}
        />
      </div>
      <RestartStudyDialog
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        onConfirm={handleConfirmRestart}
      />
    </div>
  );
}
