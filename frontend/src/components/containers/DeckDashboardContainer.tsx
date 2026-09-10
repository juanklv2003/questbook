import * as React from "react"
import { useDecks } from "../../hooks/useDecks"
import { useDeckGenerator } from "../../hooks/useDeckGenerator"
import { useDeckShelf } from "../../hooks/useDeckShelf"
import { DeckUploader } from "../organisms/DeckUploader"
import { CreateDeckDrawer } from "../organisms/CreateDeckDrawer"
import { BookCard } from "../molecules/BookCard"
import { Bookshelf } from "../molecules/Bookshelf"
import { QuotaCountdownAlert } from "../molecules/QuotaCountdownAlert"
import { Button } from "../atoms/Button"
import { Plus, BookOpen } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageContext"
import type { Deck, DeckGenerationOptions } from "../../types"

/** Legacy payload aliases (title/cardCount) tolerated by the dashboard. */
type DeckLike = Deck & { title?: string; cardCount?: number }

/** Book display name with legacy `title` fallback. */
const deckTitle = (d: Deck): string => d.name || (d as DeckLike).title || ""

type DeckAccent = "primary" | "violet" | "emerald" | "amber" | "rose";

const isDeckAccent = (value: unknown): value is DeckAccent =>
  value === "primary" || value === "violet" || value === "emerald" || value === "amber" || value === "rose";

/** Persisted accent only: NULL/legacy keeps the name-hash fallback inside BookCard. */
const deckAccent = (d: Deck): DeckAccent | undefined =>
  isDeckAccent(d.color) ? d.color : undefined;

export function DeckDashboardContainer({
  onSelectDeck,
  createSignal = 0,
}: {
  onSelectDeck: (id: string) => void;
  /** Increment to open the create-deck drawer from outside (e.g. topbar CTA). */
  createSignal?: number;
}) {
  const { t } = useLanguage();
  const { decks, isLoading, setDecks } = useDecks();
  const { generateDeckFromPdf, isGenerating, isAiProcessing, progress, error, quotaExceeded, clearError } = useDeckGenerator();
  const {
    shelves,
    shelfCount,
    moveDeck,
    moveWithinShelf,
    moveToShelf,
    shelfError,
    clearShelfError,
  } = useDeckShelf(decks, setDecks);
  const [showUploader, setShowUploader] = React.useState(false);
  const prevSignal = React.useRef(createSignal);

  // External trigger (topbar CTA) opens the existing drawer.
  React.useEffect(() => {
    if (createSignal > prevSignal.current) {
      setShowUploader(true);
    }
    prevSignal.current = createSignal;
  }, [createSignal]);

  // Flat shelf-by-shelf order for rendering (left to right, top to bottom).
  const orderedBooks = React.useMemo(
    () =>
      shelves.flatMap((shelfDecks, shelf) =>
        shelfDecks.map((deck, index) => ({ deck, shelf, index, size: shelfDecks.length }))
      ),
    [shelves]
  );

  const handleUpload = async (file: File, options: DeckGenerationOptions) => {
    try {
      const result = await generateDeckFromPdf(file, options);
      // Optimistic addition: new books land first on shelf 0 (matches backend bump).
      setDecks(prev => [{
        id: result.deckId,
        name: result.name,
        flashcardsCount: result.flashcardsCount,
        color: options.color ?? result.color ?? 'primary',
        shelfIndex: 0,
        position: 0,
      } as Deck, ...prev]);
      setShowUploader(false);
    } catch (err) {
      console.error(err);
    }
  };

  const closeUploader = React.useCallback(() => {
    if (!isGenerating) setShowUploader(false);
  }, [isGenerating]);

  return (
    <div className="w-full flex-1 flex flex-col justify-center animate-in fade-in">
      {/* Content */}
      {isLoading ? (
        /* Loading skeleton */
        <Bookshelf>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-44 w-full rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </Bookshelf>
      ) : decks.length > 0 ? (
        <>
          {shelfError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <span>{shelfError}</span>
              <Button variant="ghost" size="sm" onClick={clearShelfError}>
                {t("dash.understood")}
              </Button>
            </div>
          )}
          {/* Bookshelf with books */}
          <Bookshelf
            shelves={shelfCount}
            shelfOf={(i) => orderedBooks[i]?.shelf ?? 0}
            bookIds={(i) => orderedBooks[i]?.deck.id ?? null}
            onMoveBook={moveDeck}
          >
            {orderedBooks.map(({ deck, shelf, index, size }) => (
              <BookCard
                key={deck.id}
                deckId={deck.id}
                name={deckTitle(deck)}
                flashcardsCount={deck.flashcardsCount || (deck as DeckLike).cardCount || 0}
                progressPercent={deck.progressPercent ?? null}
                accentColor={deckAccent(deck)}
                onSelect={() => onSelectDeck(deck.id)}
                onDeleteSuccess={() => {
                  setDecks(prev => prev.filter(d => d.id !== deck.id))
                }}
                shelfIndex={shelf}
                shelfCount={shelfCount}
                onMoveLeft={() => moveWithinShelf(deck.id, -1)}
                onMoveRight={() => moveWithinShelf(deck.id, 1)}
                onMoveToShelf={(target) => moveToShelf(deck.id, target)}
                canMoveLeft={index > 0}
                canMoveRight={index < size - 1}
              />
            ))}
          </Bookshelf>
        </>
      ) : (
        /* Empty state */
        <div className="relative">
          {/* Empty bookshelf */}
          <Bookshelf>
            {/* Decorative empty books */}
            {[
              { h: "h-32", w: "w-8", color: "bg-primary/15", rotate: "rotate-[-2deg]" },
              { h: "h-36", w: "w-6", color: "bg-primary/10", rotate: "rotate-[1deg]" },
              { h: "h-28", w: "w-7", color: "bg-primary/12", rotate: "rotate-[-1deg]" },
            ].map((book, i) => (
              <div key={i} className="flex justify-center">
                <div className={`${book.h} ${book.w} ${book.color} ${book.rotate} rounded-sm`} />
              </div>
            ))}
          </Bookshelf>

          {/* Empty state overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 mb-4">
              <BookOpen className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-medium mb-2">{t("dash.emptyTitle")}</h3>
            <p className="text-muted-foreground max-w-sm mb-6 text-center px-4">
              {t("dash.emptyDescription")}
            </p>
            <Button onClick={() => setShowUploader(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("dash.emptyCta")}
            </Button>
          </div>
        </div>
      )}

      <CreateDeckDrawer
        open={showUploader}
        onClose={closeUploader}
        disableClose={isGenerating}
      >
        <div className="flex flex-col items-center gap-6">
          <DeckUploader
            onUpload={handleUpload}
            isGenerating={isGenerating}
            progress={progress}
            isAiProcessing={isAiProcessing}
          />
          {quotaExceeded ? (
            <QuotaCountdownAlert quota={quotaExceeded} onAcknowledge={clearError} actionKey="generate" />
          ) : (
            error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
          )}
        </div>
      </CreateDeckDrawer>
    </div>
  )
}
