import * as React from "react"
import type { KeyboardEvent } from "react"
import { cn } from "../../lib/utils"
import { BookOpen, Play, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageContext"
import { DeckDeleteButton } from "../atoms/DeckDeleteButton"

export interface BookCardProps {
  deckId: string;
  name: string;
  flashcardsCount: number;
  /** 0–100 study progress. Absent/null = not tracked yet (bar hidden). */
  progressPercent?: number | null;
  onSelect: () => void;
  onDeleteSuccess: () => void;
  onEdit?: () => void;
  /** Color accent for the book spine. */
  accentColor?: "primary" | "violet" | "emerald" | "amber" | "rose";
  /** Show as horizontal book (laying down) */
  horizontal?: boolean;
  /** 0-based shelf where this book sits (for the move fallbacks). */
  shelfIndex?: number;
  /** Total shelf count (for the move fallbacks). */
  shelfCount?: number;
  /** Button fallbacks so the book can be moved without drag & drop. */
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onMoveToShelf?: (shelf: number) => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

const ACCENT_STYLES = {
  primary: {
    spine: "bg-primary",
    hover: "hover:shadow-[0_4px_20px_-2px_hsl(var(--primary)/0.4)]",
    bookmark: "bg-primary",
    badge: "bg-primary/10 text-primary",
  },
  violet: {
    spine: "bg-violet-600",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(139,92,246,0.4)]",
    bookmark: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-600",
  },
  emerald: {
    spine: "bg-emerald-600",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(16,185,129,0.4)]",
    bookmark: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600",
  },
  amber: {
    spine: "bg-amber-600",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(245,158,11,0.4)]",
    bookmark: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600",
  },
  rose: {
    spine: "bg-rose-600",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(244,63,94,0.4)]",
    bookmark: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-600",
  },
} as const;

// Deterministic color based on deck name
function getAccentForDeck(name: string): "primary" | "violet" | "emerald" | "amber" | "rose" {
  const accents: ("primary" | "violet" | "emerald" | "amber" | "rose")[] = ["primary", "violet", "emerald", "amber", "rose"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return accents[Math.abs(hash) % accents.length];
}

// Deterministic height based on deck name (compact on mobile so the tallest
// book + bookmark still fit the 152px mobile shelf; full size from sm up).
function getHeightForDeck(name: string): string {
  const heights = ["h-24 sm:h-28", "h-24 sm:h-32", "h-28 sm:h-36", "h-28 sm:h-40", "h-32 sm:h-44"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return heights[Math.abs(hash) % heights.length];
}

// Width based on flashcardsCount (more cards = wider).
// One step narrower on mobile so a full shelf fits ~360px; full width from sm up.
function getWidthForCards(count: number): string {
  if (count <= 5) return "w-6 sm:w-7";
  if (count <= 10) return "w-7 sm:w-9";
  if (count <= 15) return "w-8 sm:w-10";
  if (count <= 20) return "w-8 sm:w-11";
  if (count <= 30) return "w-9 sm:w-12";
  return "w-10 sm:w-14";
}

export function BookCard({ deckId, name, flashcardsCount, progressPercent, onSelect, onDeleteSuccess, onEdit, accentColor, horizontal, shelfIndex, shelfCount, onMoveLeft, onMoveRight, onMoveToShelf, canMoveLeft, canMoveRight }: BookCardProps) {
  const { t } = useLanguage();
  const accent = accentColor ?? getAccentForDeck(name);
  const styles = ACCENT_STYLES[accent];
  const height = getHeightForDeck(name);
  const width = getWidthForCards(flashcardsCount);
  const progress =
    typeof progressPercent === "number" ? Math.min(100, Math.max(0, Math.round(progressPercent))) : null;
  const moveProps = { shelfIndex, shelfCount, onMoveLeft, onMoveRight, onMoveToShelf, canMoveLeft, canMoveRight };
  // Adaptive popover anchoring so the card grows toward free space instead of
  // under a wooden board: first shelf opens downward, last shelf upward.
  const isFirstShelf = shelfIndex === 0;
  const isLastShelf =
    shelfIndex !== undefined && shelfCount !== undefined && shelfCount > 1 && shelfIndex === shelfCount - 1;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const [touchMenuOpen, setTouchMenuOpen] = React.useState(false);
  const prefersHover = React.useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches,
    []
  );

  React.useEffect(() => {
    if (!touchMenuOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setTouchMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [touchMenuOpen]);

  const handleSpineClick = () => {
    if (prefersHover) {
      onSelect();
      return;
    }
    setTouchMenuOpen((open) => !open);
  };

  const handleDeleteSuccess = () => {
    setTouchMenuOpen(false);
    onDeleteSuccess();
  };

  const hoverPanelClass = cn(
    "opacity-0 invisible pointer-events-none",
    "[transition:opacity_150ms_ease,visibility_0s_linear_200ms]",
    touchMenuOpen && "opacity-100 visible pointer-events-auto [transition:opacity_150ms_ease,visibility_0s]",
    "group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-hover:[transition:opacity_150ms_ease,visibility_0s]",
    "group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:[transition:opacity_150ms_ease,visibility_0s]"
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    // Let the action buttons inside the hover card handle their own keys.
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  // Horizontal book (laying down)
  if (horizontal) {
    return (
      <div ref={rootRef} className="group relative hover:z-30 focus-within:z-30">
        <div
          onClick={handleSpineClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={t("book.openAria", { name })}
          className={cn(
            "relative cursor-pointer select-none",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm",
            styles.hover
          )}
        >
          {/* Horizontal book spine */}
          <div className={cn(
            "relative h-8 rounded-sm overflow-hidden",
            styles.spine,
            "shadow-md",
            "flex items-center px-3 gap-2"
          )}>
            <div className="absolute left-1 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
            <span className="text-[10px] font-semibold text-white/90 truncate flex-1 drop-shadow-sm">
              {name}
            </span>
            <div className="flex items-center gap-1 text-[9px] text-white/70">
              <BookOpen className="w-2.5 h-2.5" />
              <span>{flashcardsCount}</span>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/10" />
            {progress !== null && (
              <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/10" aria-hidden="true">
                <div className="h-full bg-white/35" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Hover card — fuera del botón del lomo para que borrar/editar no abra el libro */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-40 hidden group-hover:block",
            isFirstShelf ? "top-full h-2" : "bottom-full h-2",
            "w-52"
          )}
        />
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 w-56 max-w-[70vw] z-50",
            hoverPanelClass,
            isFirstShelf ? "top-full mt-2" : "bottom-full mb-2"
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <HoverCard
            name={name}
            flashcardsCount={flashcardsCount}
            progressPercent={progress}
            deckId={deckId}
            onDeleteSuccess={handleDeleteSuccess}
            onEdit={onEdit}
            onSelect={onSelect}
            badgeStyle={styles.badge}
            {...moveProps}
          />
        </div>
      </div>
    );
  }

  // Vertical book (standing up) - spine view
  return (
    <div ref={rootRef} className="group relative hover:z-30 focus-within:z-30">
      <div
        onClick={handleSpineClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={t("book.openAria", { name })}
        className={cn(
          "relative cursor-pointer select-none",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm",
          styles.hover
        )}
      >
        {/* Bookmark */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
          <div className={cn(
            "w-3 h-6",
            styles.bookmark,
            "rounded-b-sm",
            "shadow-sm",
            "opacity-80 group-hover:opacity-100 transition-opacity"
          )}>
            <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[5px] border-b-card" />
          </div>
        </div>

        {/* Book spine */}
        <div className={cn(
          "relative rounded-sm overflow-hidden",
          height, width,
          styles.spine,
          "shadow-lg",
          "flex flex-col items-center justify-between py-2",
          "border border-white/10"
        )}>
          <div className="w-4 h-0.5 bg-white/30 rounded-full" />
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <span className={cn(
              "text-white font-semibold drop-shadow-sm",
              "text-[10px] leading-none tracking-wide",
              "max-h-full"
            )} style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
              {name.length > 12 ? name.slice(0, 12) + "…" : name}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-3 h-px bg-white/20" />
            <div className="w-4 h-0.5 bg-white/30 rounded-full" />
          </div>
          <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-white/10" />
          {progress !== null && (
            <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10" aria-hidden="true">
              <div className="h-full bg-white/35" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Hover card — hermano del lomo, no hijo del onClick de abrir */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute z-40 hidden group-hover:block left-full w-3",
          isLastShelf ? "bottom-0 h-44" : isFirstShelf ? "top-0 h-44" : "top-1/2 -translate-y-1/2 h-44"
        )}
      />
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-52 max-w-[70vw] z-50",
          hoverPanelClass,
          isLastShelf ? "bottom-full mb-2" : "top-full mt-2",
          "sm:left-full sm:translate-x-0 sm:ml-3 sm:w-56 sm:max-w-none",
          isLastShelf
            ? "sm:bottom-0 sm:mb-0"
            : isFirstShelf
              ? "sm:top-0 sm:mt-0"
              : "sm:top-1/2 sm:-translate-y-1/2 sm:mt-0"
        )}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <HoverCard
          name={name}
          flashcardsCount={flashcardsCount}
          progressPercent={progress}
          deckId={deckId}
          onDeleteSuccess={handleDeleteSuccess}
          onEdit={onEdit}
          onSelect={onSelect}
          badgeStyle={styles.badge}
          {...moveProps}
        />
      </div>
    </div>
  )
}

// Mini hover card component
function HoverCard({
  name,
  flashcardsCount,
  progressPercent,
  deckId,
  onDeleteSuccess,
  onEdit,
  onSelect,
  badgeStyle,
  shelfIndex,
  shelfCount,
  onMoveLeft,
  onMoveRight,
  onMoveToShelf,
  canMoveLeft,
  canMoveRight,
}: {
  name: string;
  flashcardsCount: number;
  progressPercent?: number | null;
  deckId: string;
  onDeleteSuccess: () => void;
  onEdit?: () => void;
  onSelect: () => void;
  badgeStyle: string;
  shelfIndex?: number;
  shelfCount?: number;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onMoveToShelf?: (shelf: number) => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}) {
  const { t } = useLanguage();
  const showMoveControls = onMoveLeft !== undefined || onMoveToShelf !== undefined;
  const progress =
    typeof progressPercent === "number" ? Math.min(100, Math.max(0, Math.round(progressPercent))) : null;
  const shelfOptions =
    shelfCount !== undefined && shelfCount > 0
      ? Array.from({ length: shelfCount }, (_, i) => i)
      : [];
  const cardsLabel =
    flashcardsCount === 1
      ? t("book.cardsOne", { count: flashcardsCount })
      : t("book.cardsOther", { count: flashcardsCount });
  return (
    <div className="bg-card rounded-xl border shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">{name}</h4>
        <div className={cn("inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium", badgeStyle)}>
          <BookOpen className="w-3 h-3" />
          {cardsLabel}
        </div>
      </div>

      {/* Secondary text: flashcards + completed % (brief). Fallback description. */}
      {progress !== null ? (
        <div className="mt-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">{t("book.progressComplete", { progress })}</p>
          <div className="mt-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {t("book.description", { count: flashcardsCount })}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg",
            "bg-primary text-primary-foreground text-xs font-medium",
            "hover:bg-primary/90 transition-colors cursor-pointer"
          )}
        >
          <Play className="w-3 h-3" />
          {t("book.study")}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          aria-label={t("book.edit")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg",
            "bg-secondary text-secondary-foreground text-xs font-medium",
            "hover:bg-secondary/80 transition-colors cursor-pointer"
          )}
        >
          <Pencil className="w-3 h-3" />
        </button>
        <DeckDeleteButton
          deckId={deckId}
          onDeleteSuccess={onDeleteSuccess}
        />
      </div>

      {/* Move fallbacks (keyboard / touch): same actions as drag & drop */}
      {showMoveControls && (
        <div className="mt-3 pt-2.5 border-t">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
            {t("book.moveTitle")}
          </p>
          <div className="flex items-center gap-1.5">
            {onMoveLeft && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
                  disabled={!canMoveLeft}
                  aria-label={t("book.moveLeft")}
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-lg",
                    "bg-secondary text-secondary-foreground",
                    "hover:bg-secondary/80 transition-colors cursor-pointer",
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {onMoveRight && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
                    disabled={!canMoveRight}
                    aria-label={t("book.moveRight")}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-lg",
                      "bg-secondary text-secondary-foreground",
                      "hover:bg-secondary/80 transition-colors cursor-pointer",
                      "disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {onMoveLeft && onMoveToShelf && shelfOptions.length > 0 && (
              <div className="w-px self-stretch bg-border mx-0.5" aria-hidden="true" />
            )}
            {onMoveToShelf && shelfOptions.length > 0 && (
              <div className="flex items-center gap-1" role="group" aria-label={t("book.moveGroup")}>
                {shelfOptions.map((shelf) => {
                  const isCurrent = shelf === shelfIndex;
                  return (
                    <button
                      key={shelf}
                      onClick={(e) => { e.stopPropagation(); onMoveToShelf(shelf); }}
                      disabled={isCurrent}
                      aria-label={t("book.moveToShelf", { n: shelf + 1 })}
                      aria-pressed={isCurrent}
                      title={isCurrent ? t("book.alreadyOnShelf", { n: shelf + 1 }) : t("book.moveToShelf", { n: shelf + 1 })}
                      className={cn(
                        "min-w-7 h-7 px-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        isCurrent
                          ? "bg-primary text-primary-foreground cursor-default"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                        "disabled:cursor-default"
                      )}
                    >
                      {shelf + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
