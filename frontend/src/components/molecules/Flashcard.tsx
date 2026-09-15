import type { KeyboardEvent } from "react"
import { motion } from "framer-motion"
import { BookOpen, CheckCircle2, Lightbulb, MousePointerClick, XCircle } from "lucide-react"
import { cn } from "../../lib/utils"
import { useLanguage, type TranslationKey } from "../../i18n/LanguageContext"
import { Badge } from "../atoms/Badge"

export type FlashcardStatus = "pending" | "correct" | "incorrect";

export interface FlashcardProps {
  question: string;
  answer?: string;
  isFlipped: boolean;
  onFlip?: () => void;
  /** Estado de evaluación: pendiente / acertada / fallada. Solo visual. */
  status?: FlashcardStatus;
}

const STATUS_STYLES: Record<FlashcardStatus, { frame: string; strip: string; badgeColor: "default" | "success" | "danger"; badgeKey: TranslationKey }> = {
  pending: {
    frame: "border-border",
    strip: "bg-border",
    badgeColor: "default",
    badgeKey: "card.pending",
  },
  correct: {
    frame: "border-emerald-500/40",
    strip: "bg-emerald-500",
    badgeColor: "success",
    badgeKey: "card.correct",
  },
  incorrect: {
    frame: "border-destructive/40",
    strip: "bg-destructive",
    badgeColor: "danger",
    badgeKey: "card.incorrect",
  },
};

export function Flashcard({ question, answer, isFlipped, onFlip, status = "pending" }: FlashcardProps) {
  const { t } = useLanguage();
  const styles = STATUS_STYLES[status];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!onFlip) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onFlip();
    }
  };

  const faceBase =
    "absolute inset-0 backface-hidden overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md flex flex-col";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={t("card.ariaLabel", { question })}
      onClick={onFlip}
      onKeyDown={handleKeyDown}
      className="w-full max-w-2xl min-h-[260px] sm:aspect-[3/2] sm:min-h-0 perspective-1000 cursor-pointer select-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <motion.div
        className="w-full h-full min-h-[inherit] sm:min-h-0 sm:h-full relative transform-style-3d"
        animate={{ rotateX: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Front — pregunta */}
        <div className={cn(faceBase, styles.frame)}>
          <div aria-hidden="true" className={cn("h-1 w-full shrink-0", styles.strip)} />
          <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-8 sm:pt-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {t("card.question")}
            </p>
            <Badge color={styles.badgeColor} label={t(styles.badgeKey)} />
          </div>
          <div className="flex flex-1 items-center justify-center px-5 py-4 sm:px-8">
            <h3 className="text-center text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
              {question}
            </h3>
          </div>
          <p className="flex items-center justify-center gap-1.5 px-5 pb-4 text-xs text-muted-foreground sm:px-8 sm:pb-5">
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
            {t("card.flipToAnswer")}
          </p>
        </div>

        {/* Back — respuesta (superficie clara bg-card, no marrón) */}
        <div
          className={cn(faceBase, styles.frame)}
          style={{ transform: "rotateX(180deg)" }}
        >
          <div aria-hidden="true" className={cn("h-1 w-full shrink-0", styles.strip)} />
          <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-8 sm:pt-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              {t("card.answer")}
            </p>
            {status === "correct" ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("card.correct")}
              </span>
            ) : status === "incorrect" ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-destructive">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {t("card.incorrect")}
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-4 sm:px-8">
            <p className="w-full text-center text-base leading-relaxed text-card-foreground sm:text-xl">
              {answer || t("card.noAnswer")}
            </p>
          </div>
          <p className="flex items-center justify-center gap-1.5 px-5 pb-4 text-xs text-muted-foreground sm:px-8 sm:pb-5">
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
            {t("card.backToQuestion")}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
