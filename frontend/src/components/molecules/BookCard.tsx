import { cn } from "../../lib/utils"
import { BookOpen, Play, Pencil } from "lucide-react"
import { DeckDeleteButton } from "../atoms/DeckDeleteButton"

export interface BookCardProps {
  deckId: string;
  name: string;
  flashcardsCount: number;
  onSelect: () => void;
  onDeleteSuccess: () => void;
  onEdit?: () => void;
  /** Color accent for the book spine. */
  accentColor?: "primary" | "violet" | "emerald" | "amber" | "rose";
  /** Show as horizontal book (laying down) */
  horizontal?: boolean;
}

const ACCENT_STYLES = {
  primary: {
    spine: "from-primary via-primary/90 to-primary/80",
    hover: "hover:shadow-[0_4px_20px_-2px_hsl(var(--primary)/0.4)]",
    bookmark: "bg-primary",
    badge: "bg-primary/10 text-primary",
  },
  violet: {
    spine: "from-violet-600 via-violet-500 to-violet-400",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(139,92,246,0.4)]",
    bookmark: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-600",
  },
  emerald: {
    spine: "from-emerald-600 via-emerald-500 to-emerald-400",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(16,185,129,0.4)]",
    bookmark: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600",
  },
  amber: {
    spine: "from-amber-600 via-amber-500 to-amber-400",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(245,158,11,0.4)]",
    bookmark: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600",
  },
  rose: {
    spine: "from-rose-600 via-rose-500 to-rose-400",
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

// Deterministic height based on deck name
function getHeightForDeck(name: string): string {
  const heights = ["h-28", "h-32", "h-36", "h-40", "h-44"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return heights[Math.abs(hash) % heights.length];
}

// Width based on flashcardsCount (more cards = wider)
function getWidthForCards(count: number): string {
  if (count <= 5) return "w-7";
  if (count <= 10) return "w-9";
  if (count <= 15) return "w-10";
  if (count <= 20) return "w-11";
  if (count <= 30) return "w-12";
  return "w-14";
}

export function BookCard({ deckId, name, flashcardsCount, onSelect, onDeleteSuccess, onEdit, accentColor, horizontal }: BookCardProps) {
  const accent = accentColor ?? getAccentForDeck(name);
  const styles = ACCENT_STYLES[accent];
  const height = getHeightForDeck(name);
  const width = getWidthForCards(flashcardsCount);

  // Horizontal book (laying down)
  if (horizontal) {
    return (
      <div className="group relative">
        <div
          onClick={(e) => { e.preventDefault(); onSelect(); }}
          className={cn(
            "relative cursor-pointer select-none",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "hover:-translate-y-1",
            styles.hover
          )}
        >
          {/* Horizontal book spine */}
          <div className={cn(
            "relative h-8 rounded-sm overflow-hidden",
            "bg-gradient-to-r",
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
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/30 via-white/20 to-white/30" />
          </div>

          {/* Hover card for horizontal */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
            <HoverCard
              name={name}
              flashcardsCount={flashcardsCount}
              deckId={deckId}
              onDeleteSuccess={onDeleteSuccess}
              onEdit={onEdit}
              onSelect={onSelect}
              badgeStyle={styles.badge}
            />
          </div>
        </div>
      </div>
    );
  }

  // Vertical book (standing up) - spine view
  return (
    <div className="group relative">
      <div
        onClick={(e) => { e.preventDefault(); onSelect(); }}
        className={cn(
          "relative cursor-pointer select-none",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:-translate-y-1",
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
          "bg-gradient-to-b",
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
          <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-gradient-to-b from-white/40 via-white/25 to-white/40" />
        </div>

        {/* Hover card */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
          <HoverCard
            name={name}
            flashcardsCount={flashcardsCount}
            deckId={deckId}
            onDeleteSuccess={onDeleteSuccess}
            onEdit={onEdit}
            onSelect={onSelect}
            badgeStyle={styles.badge}
          />
        </div>
      </div>
    </div>
  )
}

// Mini hover card component
function HoverCard({
  name,
  flashcardsCount,
  deckId,
  onDeleteSuccess,
  onEdit,
  onSelect,
  badgeStyle,
}: {
  name: string;
  flashcardsCount: number;
  deckId: string;
  onDeleteSuccess: () => void;
  onEdit?: () => void;
  onSelect: () => void;
  badgeStyle: string;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">{name}</h4>
        <div className={cn("inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium", badgeStyle)}>
          <BookOpen className="w-3 h-3" />
          {flashcardsCount} tarjetas
        </div>
      </div>

      {/* Description placeholder */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        Mazo de estudio con {flashcardsCount} preguntas y respuestas.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg",
            "bg-primary text-primary-foreground text-xs font-medium",
            "hover:bg-primary/90 transition-colors cursor-pointer"
          )}
        >
          <Play className="w-3 h-3" />
          Repetir
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
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
    </div>
  )
}
