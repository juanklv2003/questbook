import { CheckCircle2, Circle, ListChecks, XCircle } from "lucide-react"
import { cn } from "../../lib/utils"
import { useLanguage, type TranslationKey } from "../../i18n/LanguageContext"
import type { FlashcardStatus } from "./Flashcard"

export interface ReviewListItem {
  id: string;
  question: string;
  status: FlashcardStatus;
}

export interface StudyReviewListProps {
  items: ReviewListItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const STATUS_META: Record<FlashcardStatus, { labelKey: TranslationKey }> = {
  correct: { labelKey: "card.correct" },
  incorrect: { labelKey: "card.incorrect" },
  pending: { labelKey: "card.pending" },
};

function StatusIcon({ status }: { status: FlashcardStatus }) {
  if (status === "correct") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
  }
  if (status === "incorrect") {
    return <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
  }
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
}

/**
 * Lista de repaso de la sesión — solo presentación, sin fetch.
 * Cada pregunta es un botón real que salta a esa tarjeta.
 */
export function StudyReviewList({ items, activeIndex, onSelect }: StudyReviewListProps) {
  const { t } = useLanguage();
  const doneCount = items.filter((i) => i.status !== "pending").length;

  return (
    <nav aria-label={t("review.title")} className="flex min-h-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t("review.title")}
        </h2>
        <p className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground" aria-live="polite">
          {doneCount}/{items.length}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("review.empty")}</p>
      ) : (
        <ol className="flex min-h-0 gap-2 overflow-x-auto pb-1 lg:max-h-[52vh] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 lg:pr-1">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const meta = STATUS_META[item.status];
            const statusLabel = t(meta.labelKey);
            return (
              <li key={item.id} className="shrink-0 basis-52 sm:basis-60 lg:basis-auto lg:shrink">
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-label={t("review.goToQuestion", { n: index + 1, label: statusLabel })}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    isActive
                      ? "border-primary/40 bg-accent/70"
                      : "border-transparent bg-transparent hover:border-border hover:bg-accent/50"
                  )}
                >
                  <span className="mt-0.5">
                    <StatusIcon status={item.status} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("review.questionLabel", { n: index + 1, label: statusLabel })}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-foreground">
                      {item.question}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  )
}
