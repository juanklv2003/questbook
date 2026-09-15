import { BookOpen, ChartColumn, Layers } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageContext"

export interface ProgressBook {
  id: string;
  name: string;
  cards: number;
  /** 0–100 study progress. Null = no data tracked yet. */
  progress: number | null;
}

export interface ProgressPanelProps {
  totalBooks: number;
  totalCards: number;
  /** Average over books with non-null progress. Null = no data yet. */
  averageProgress: number | null;
  books: ProgressBook[];
}

/**
 * Study progress summary — purely presentational, no fetch.
 * Totals + average + per-book bars. Honest nulls: "sin datos".
 */
export function ProgressPanel({ totalBooks, totalCards, averageProgress, books }: ProgressPanelProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border bg-muted/40 px-3 py-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {t("progress.books")}
          </dt>
          <dd className="text-xl font-bold tracking-tight" aria-label={totalBooks === 1 ? t("progress.booksOne", { count: totalBooks }) : t("progress.booksOther", { count: totalBooks })}>
            {totalBooks}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border bg-muted/40 px-3 py-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            {t("progress.cards")}
          </dt>
          <dd className="text-xl font-bold tracking-tight" aria-label={totalCards === 1 ? t("book.cardsOne", { count: totalCards }) : t("book.cardsOther", { count: totalCards })}>
            {totalCards}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border bg-muted/40 px-3 py-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ChartColumn className="h-3.5 w-3.5" aria-hidden="true" />
            {t("progress.average")}
          </dt>
          <dd
            className="text-xl font-bold tracking-tight"
            aria-label={averageProgress !== null ? t("progress.averageAria", { value: averageProgress }) : t("progress.averageEmpty")}
          >
            {averageProgress !== null ? `${averageProgress}%` : "—"}
          </dd>
        </div>
      </dl>

      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ChartColumn className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold tracking-tight">{t("progress.emptyTitle")}</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t("progress.emptyDesc")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={t("progress.listAria")}>
          {books.map((book) => {
            const clamped =
              typeof book.progress === "number" ? Math.min(100, Math.max(0, Math.round(book.progress))) : null
            return (
              <li key={book.id} className="rounded-xl border px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold tracking-tight" title={book.name}>
                    {book.name || t("progress.untitled")}
                  </p>
                  <p className="shrink-0 text-xs font-medium text-muted-foreground" aria-label={book.cards === 1 ? t("book.cardsOne", { count: book.cards }) : t("book.cardsOther", { count: book.cards })}>
                    {book.cards === 1 ? t("book.cardsOne", { count: book.cards }) : t("book.cardsOther", { count: book.cards })}
                  </p>
                </div>
                {clamped !== null ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/60"
                        role="progressbar"
                        aria-valuenow={clamped}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={t("progress.bookProgressAria", { name: book.name, value: clamped })}
                      >
                        <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums">{clamped}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">{t("progress.noData")}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
