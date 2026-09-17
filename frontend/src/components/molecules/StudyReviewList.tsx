import * as React from "react"
import { CheckCircle2, ChevronDown, Circle, ListChecks, XCircle } from "lucide-react"
import { cn } from "../../lib/utils"
import { useLanguage, type TranslationKey } from "../../i18n/LanguageContext"
import { useMinWidthLg } from "../../hooks/useMinWidthLg"
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
 * Móvil (<lg): acordeón con scroll interno al expandir.
 * Escritorio (≥1024, p. ej. 720p/1080p): sidebar «Repasar» como antes — lista vertical con max 52vh.
 */
export function StudyReviewList({ items, activeIndex, onSelect }: StudyReviewListProps) {
  const { t } = useLanguage();
  const isDesktop = useMinWidthLg();
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const doneCount = items.filter((i) => i.status !== "pending").length;

  if (isDesktop) {
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
          <ol className="flex min-h-0 max-h-[52vh] flex-col gap-2 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              const meta = STATUS_META[item.status];
              const statusLabel = t(meta.labelKey);
              return (
                <li key={item.id} className="min-w-0 shrink-0">
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
                      <span className="mt-0.5 block line-clamp-2 break-words text-sm leading-snug text-foreground">
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
    );
  }

  return (
    <nav aria-label={t("review.title")} className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex min-h-[44px] w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "border-border/60 bg-background hover:bg-accent/50"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-sm font-semibold tracking-tight tabular-nums">
            {t("study.reviewQuestions", { done: doneCount, total: items.length })}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      {open &&
        (items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("review.empty")}</p>
        ) : (
          <ol
            id={listId}
            className="flex max-h-[min(18rem,calc(100dvh-16rem))] min-h-0 flex-col gap-1 overflow-y-auto overscroll-y-contain pb-1 pr-1 [-webkit-overflow-scrolling:touch]"
          >
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              const meta = STATUS_META[item.status];
              const statusLabel = t(meta.labelKey);
              return (
                <li key={item.id} className="min-w-0">
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
                      <span className="mt-0.5 block break-words text-sm leading-relaxed text-foreground">
                        {item.question}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ))}
    </nav>
  );
}
