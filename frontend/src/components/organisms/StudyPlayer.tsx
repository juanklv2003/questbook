import * as React from "react"
import type { Flashcard as FlashcardType, EvaluationResult as EvaluationResultType, ModelOverloadedInfo, QuotaExceededInfo } from '../../types'
import { Flashcard, type FlashcardStatus } from "../molecules/Flashcard"
import { StudyReviewList, type ReviewListItem } from "../molecules/StudyReviewList"
import { EvaluationResult } from "../molecules/EvaluationResult"
import { QuotaCountdownAlert } from "../molecules/QuotaCountdownAlert"
import { Button } from "../atoms/Button"
import { TextArea } from "../atoms/TextArea"
import { useLanguage } from "../../i18n/LanguageContext"
import { Send, RotateCcw, ArrowRight, AlertCircle, Shuffle } from "lucide-react"

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
}: StudyPlayerProps) {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = React.useState(false);

  // Auto flip to back when evaluation comes in
  React.useEffect(() => {
    if (evaluation) setIsFlipped(true);
    else setIsFlipped(false);
  }, [evaluation]);

  // Al cambiar de tarjeta se vuelve al frente.
  React.useEffect(() => {
    setIsFlipped(false);
  }, [card.id]);

  const cardStatus: FlashcardStatus = evaluation
    ? (evaluation.isCorrect ? "correct" : "incorrect")
    : "pending";

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  const showReview = reviewItems.length > 0 && typeof onSelectCard === "function";

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 pt-3 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-3 px-1 sm:px-2">
        <div className="w-full flex justify-between items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-muted-foreground uppercase tracking-widest">
            {t("study.sessionTitle")}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="text-sm font-medium tabular-nums bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
              {progress} / {total}
            </span>
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
          <div className="w-full max-w-2xl flex justify-center">
            <Flashcard
              question={card.question}
              answer={card.answer}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
              status={cardStatus}
            />
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-4">
            {!evaluation ? (
              <div className="flex flex-col gap-4">
                {((quotaExceeded ?? overloaded) && onAcknowledgeQuota) ? (
                  <QuotaCountdownAlert
                    quota={(quotaExceeded ?? overloaded)!}
                    onAcknowledge={onAcknowledgeQuota}
                    actionKey="evaluate"
                    variant={quotaExceeded ? "quota" : "overloaded"}
                  />
                ) : (
                  error && (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )
                )}
                <label htmlFor="study-answer" className="text-sm font-medium">
                  {t("study.answerLabel")}
                </label>
                <TextArea
                  id="study-answer"
                  placeholder={t("study.answerPlaceholder")}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (userAnswer.trim() && !isEvaluating) {
                        onSubmit();
                      }
                    }
                  }}
                  disabled={isEvaluating}
                  className="text-base min-h-[96px] bg-card"
                />
                <Button
                  onClick={onSubmit}
                  isLoading={isEvaluating}
                  disabled={!userAnswer.trim()}
                  className="w-full h-12 text-base"
                >
                  {!isEvaluating && <Send className="w-4 h-4 mr-2" aria-hidden="true" />}
                  {t("study.submitAnswer")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                <EvaluationResult
                  score={evaluation.score}
                  feedback={evaluation.feedback}
                  isCorrect={evaluation.isCorrect}
                />
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" onClick={onRetry} className="flex-1 h-12">
                    <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                    {t("study.retry")}
                  </Button>
                  <Button onClick={onNext} className="flex-1 h-12">
                    {t("study.nextCard")}
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
