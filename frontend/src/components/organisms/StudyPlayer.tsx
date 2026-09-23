import * as React from "react"
import type { Flashcard as FlashcardType, EvaluationResult as EvaluationResultType, ModelOverloadedInfo, QuotaExceededInfo } from '../../types'
import { Flashcard, type FlashcardStatus } from "../molecules/Flashcard"
import { StudyReviewList, type ReviewListItem } from "../molecules/StudyReviewList"
import { EvaluationResult } from "../molecules/EvaluationResult"
import { QuotaCountdownAlert } from "../molecules/QuotaCountdownAlert"
import { Button } from "../atoms/Button"
import { TextArea } from "../atoms/TextArea"
import { useLanguage } from "../../i18n/LanguageContext"
import { Send, RotateCcw, ArrowRight, ArrowLeft, AlertCircle, Shuffle, Eye } from "lucide-react"
import type { StudyMode } from "../../lib/studyMode"
import { StudyModeSwitch } from "../molecules/StudyModeSwitch"

export interface StudyPlayerProps {
  card: FlashcardType;
  progress: number;
  total: number;
  userAnswer: string;
  setUserAnswer: (val: string) => void;
  onSubmit: () => void;
  isEvaluating: boolean;
  evaluation: EvaluationResultType | null;
  onNext: () => void;
  onRetry: () => void;
  /** Error de evaluación (p. ej., la IA no respondió). Se muestra como alerta. */
  error?: string | null;
  /** Structured quota block (429). Renders the countdown instead of the plain error. */
  quotaExceeded?: QuotaExceededInfo | null;
  /** Structured saturation block (503). Same countdown UI with overloaded copy. */
  overloaded?: ModelOverloadedInfo | null;
  /** Clears the quota/error notice (wired to the alert button). */
  onAcknowledgeQuota?: () => void;
  /** Lista de repaso (panel izquierdo). Vacía = se oculta el panel. */
  reviewItems?: ReviewListItem[];
  /** Índice activo dentro de reviewItems. */
  activeIndex?: number;
  /** Salto a una tarjeta desde la lista de repaso. */
  onSelectCard?: (index: number) => void;
  /** Reinicio de la sesión (lo cablea el container). Ausente = se oculta. */
  onRestart?: () => void;
  /** Nuevo orden aleatorio sin borrar aciertos/errores ya guardados. */
  onReshuffle?: () => void;
  /** No me la sé: la carta vuelve al final de la cola. */
  onDeferCard?: () => void;
  /** Tarjetas pendientes en la cola de esta sesión. */
  queueRemaining?: number;
  studyMode: StudyMode;
  onStudyModeChange: (mode: StudyMode) => void;
  /** Modo rápido: el usuario ya pidió ver la respuesta del libro. */
  answerRevealed?: boolean;
}

export function StudyPlayer({
  card,
  progress,
  total,
  userAnswer,
  setUserAnswer,
  onSubmit,
  isEvaluating,
  evaluation,
  onNext,
  onRetry,
  error = null,
  quotaExceeded = null,
  overloaded = null,
  onAcknowledgeQuota,
  reviewItems = [],
  activeIndex = 0,
  onSelectCard,
  onRestart,
  onReshuffle,
  onDeferCard,
  queueRemaining,
  studyMode,
  onStudyModeChange,
  answerRevealed = false,
}: StudyPlayerProps) {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = React.useState(false);
  const nextButtonRef = React.useRef<HTMLButtonElement>(null);

  const inReview =
    Boolean(evaluation) || (studyMode === "quick" && answerRevealed);

  React.useEffect(() => {
    setIsFlipped(inReview);
  }, [card.id, inReview]);

  React.useEffect(() => {
    if (inReview) {
      nextButtonRef.current?.focus({ preventScroll: true });
    }
  }, [inReview]);

  const cardStatus: FlashcardStatus = evaluation
    ? (evaluation.isCorrect ? "correct" : "incorrect")
    : "pending";

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  const showReview = reviewItems.length > 0 && typeof onSelectCard === "function";

  const isTypingTarget = (target: HTMLElement | null) =>
    Boolean(target?.closest('button, input, textarea, select, a, [aria-modal="true"]'));

  // Enter / flechas: corregir, «me la sé» o «no me la sé» tras la evaluación.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEvaluating) return;
      const target = e.target instanceof HTMLElement ? e.target : null;

      if (inReview) {
        // Arrows are global after grading, but text fields and open modals
        // own them. Buttons do NOT own arrows — focus lands on the primary
        // button right after grading, so blocking here kills the shortcut.
        const ownsArrows = Boolean(
          target?.closest('input, textarea, select, [aria-modal="true"]')
        );

        if (e.key === "ArrowLeft" && onDeferCard && !ownsArrows) {
          e.preventDefault();
          e.stopPropagation();
          onDeferCard();
          return;
        }
        if (e.key === "ArrowRight" && !ownsArrows) {
          e.preventDefault();
          e.stopPropagation();
          onNext();
          return;
        }
        if (e.key === "Enter") {
          if (e.shiftKey) return;
          // Focused button or open modal keeps its native activation.
          if (isTypingTarget(target)) return;
          e.preventDefault();
          e.stopPropagation();
          onNext();
          return;
        }
        return;
      }

      if (e.key !== "Enter" || e.shiftKey) return;
      if (isTypingTarget(target)) return;
      if (studyMode === "ai" && !userAnswer.trim()) return;

      e.preventDefault();
      onSubmit();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [inReview, isEvaluating, userAnswer, studyMode, onSubmit, onNext, onDeferCard]);

  const reviewActions = (
    <div className="flex flex-col sm:flex-row gap-4">
      {onDeferCard && (
        <Button variant="outline" onClick={onDeferCard} className="flex-1 h-12">
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          {t("study.deferCard")}
        </Button>
      )}
      <Button variant="outline" onClick={onRetry} className="flex-1 h-12">
        <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
        {t("study.retry")}
      </Button>
      <Button ref={nextButtonRef} onClick={onNext} className="flex-1 h-12">
        {t("study.knowCard")}
        <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 pt-3 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-3 px-1 sm:px-2">
        <div className="w-full flex justify-between items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-muted-foreground uppercase tracking-widest">
            {t("study.sessionTitle")}
          </span>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <StudyModeSwitch mode={studyMode} onChange={onStudyModeChange} className="hidden sm:inline-flex" />
            <span className="text-sm font-medium tabular-nums bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
              {progress} / {total}
            </span>
            {typeof queueRemaining === "number" && (
              <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
                {t("study.queueRemaining", { count: queueRemaining })}
              </span>
            )}
            {onReshuffle && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onReshuffle}
                aria-label={t("study.reroll")}
                title={t("study.reroll")}
                className="h-9 w-9 shrink-0 text-muted-foreground"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {onRestart && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRestart}
                aria-label={t("study.restart")}
                title={t("study.restart")}
                className="h-9 w-9 shrink-0 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("study.sessionProgressAria", { progress, total })}
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className={`grid w-full gap-6 ${showReview ? "lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start" : ""}`}>
        {showReview && (
          <aside className="order-2 min-w-0 rounded-xl border bg-card p-4 text-card-foreground shadow-sm lg:order-1 lg:sticky lg:top-20">
            <StudyReviewList items={reviewItems} activeIndex={activeIndex} onSelect={onSelectCard!} />
          </aside>
        )}

        <div className="order-1 flex min-w-0 flex-col items-center gap-4 lg:order-2">
          <div className="w-full max-w-2xl flex flex-col items-center gap-2">
            <div className="w-full flex justify-center">
              <Flashcard
                question={card.question}
                answer={card.answer}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
                status={cardStatus}
              />
            </div>
            <StudyModeSwitch
              mode={studyMode}
              onChange={onStudyModeChange}
              className="sm:hidden"
            />
            {onDeferCard && (
              <p
                className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground"
                role="note"
              >
                <span className="text-muted-foreground/80">
                  {inReview
                    ? t("study.queueCardCheatPrefix")
                    : studyMode === "quick"
                      ? t("study.queueCardCheatPrefixQuickIdle")
                      : t("study.queueCardCheatPrefixAiIdle")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm">
                    ←
                  </kbd>
                  <span>{t("study.deferCard")}</span>
                </span>
                <span className="text-muted-foreground/50" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm">
                    →
                  </kbd>
                  <span>{t("study.knowCard")}</span>
                </span>
              </p>
            )}
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-4">
            {!inReview ? (
              <div className="flex flex-col gap-4">
                {studyMode === "ai" && ((quotaExceeded ?? overloaded) && onAcknowledgeQuota) ? (
                  <QuotaCountdownAlert
                    quota={(quotaExceeded ?? overloaded)!}
                    onAcknowledge={onAcknowledgeQuota}
                    actionKey="evaluate"
                    variant={quotaExceeded ? "quota" : "overloaded"}
                  />
                ) : (
                  studyMode === "ai" && error && (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )
                )}
                {studyMode === "quick" && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("study.quickModeBlurb")}
                  </p>
                )}
                <label htmlFor="study-answer" className="text-sm font-medium">
                  {studyMode === "quick" ? t("study.answerLabelOptional") : t("study.answerLabel")}
                </label>
                <TextArea
                  id="study-answer"
                  placeholder={t("study.answerPlaceholder")}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (isEvaluating) return;
                      if (studyMode === "quick" || userAnswer.trim()) {
                        onSubmit();
                      }
                    }
                  }}
                  disabled={isEvaluating}
                  className="text-base min-h-[96px] bg-card"
                />
                <Button
                  onClick={onSubmit}
                  isLoading={studyMode === "ai" && isEvaluating}
                  disabled={studyMode === "ai" && (!userAnswer.trim() || isEvaluating)}
                  className="w-full h-12 text-base"
                >
                  {!isEvaluating && (studyMode === "quick" ? (
                    <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                  ))}
                  {studyMode === "quick" ? t("study.showAnswer") : t("study.submitAnswer")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                {evaluation ? (
                  <EvaluationResult
                    feedback={evaluation.feedback}
                    isCorrect={evaluation.isCorrect}
                  />
                ) : (
                  <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm flex flex-col gap-3">
                    <p className="text-sm font-medium">{t("study.quickCompareTitle")}</p>
                    {userAnswer.trim() ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-lg bg-muted/40 p-3">
                        <span className="font-medium text-foreground">{t("study.yourAnswer")}: </span>
                        {userAnswer}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("study.quickNoAnswer")}</p>
                    )}
                  </div>
                )}
                {reviewActions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
