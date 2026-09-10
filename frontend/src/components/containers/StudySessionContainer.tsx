import { useFlashcardStudy } from "../../hooks/useFlashcardStudy"
import { useDeckFlashcards } from "../../hooks/useDeckFlashcards"
import { StudyPlayer } from "../organisms/StudyPlayer"
import type { Flashcard } from "../../types"
import type { ReviewListItem } from "../molecules/StudyReviewList"
import { Loader2, AlertCircle, ArrowLeft, WifiOff } from "lucide-react"
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
  const {
    tarjetaActual,
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
    restartProgress,
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
    const ok = window.confirm(t("study.restartConfirm"));
    if (!ok) return;
    void restartProgress();
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
        <Button onClick={onBack} size="lg" className="mt-4">
          {t("study.backToPanel")}
        </Button>
      </div>
    );
  }

  // Sin visor de PDF: la columna izquierda es la lista de preguntas
  // (StudyPlayer la pinta como aside) y la derecha la tarjeta activa.

  // Lista de repaso: estado por tarjeta desde el historial del hook.
  const reviewItems: ReviewListItem[] = flashcards.map((f) => ({
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
    <div className="relative w-full flex flex-col gap-4 pt-4 sm:pt-6">
      {(isOffline || sessionError) && !pendingResume && (
        <div
          role="status"
          className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2"
        >
          <p className="flex items-center gap-2 rounded-full border bg-card/95 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
            {isOffline ? (
              <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {isOffline ? t("study.sessionOffline") : t("study.sessionError")}
          </p>
        </div>
      )}
      <div className="w-full flex justify-start">
        <Button variant="ghost" size="sm" onClick={handleBack} disabled={isEvaluating} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("study.back")}
        </Button>
      </div>

      {pendingResume && (
        <div role="alert" className="w-full rounded-xl border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-muted-foreground flex-1">
            {t("study.resumePrompt", { current: pendingResume.current, total: pendingResume.total })}
          </p>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={resumeProgress}>
              {t("study.resumeYes", { current: pendingResume.current, total: pendingResume.total })}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRestart}>
              {t("study.restart")}
            </Button>
          </div>
        </div>
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
        />
      </div>
    </div>
  );
}
