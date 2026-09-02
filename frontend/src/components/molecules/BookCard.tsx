import { cn } from "../../lib/utils"
import { BookOpen, Play } from "lucide-react"
import { DeckDeleteButton } from "../atoms/DeckDeleteButton"

export interface BookCardProps {
  deckId: string;
  name: string;
  flashcardsCount: number;
  onSelect: () => void;
  onDeleteSuccess: () => void;
  /** Color accent for the book spine and bookmark. Defaults to primary. */
  accentColor?: "primary" | "violet" | "emerald" | "amber" | "rose";
}

const ACCENT_STYLES = {
  primary: {
    spine: "from-primary/80 via-primary/60 to-primary/40",
    bookmark: "bg-primary",
    coverGradient: "from-primary/10 via-primary/5 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.25)]",
  },
  violet: {
    spine: "from-violet-600/80 via-violet-500/60 to-violet-400/40",
    bookmark: "bg-violet-500",
    coverGradient: "from-violet-500/10 via-violet-500/5 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.25)]",
  },
  emerald: {
    spine: "from-emerald-600/80 via-emerald-500/60 to-emerald-400/40",
    bookmark: "bg-emerald-500",
    coverGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.25)]",
  },
  amber: {
    spine: "from-amber-600/80 via-amber-500/60 to-amber-400/40",
    bookmark: "bg-amber-500",
    coverGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.25)]",
  },
  rose: {
    spine: "from-rose-600/80 via-rose-500/60 to-rose-400/40",
    bookmark: "bg-rose-500",
    coverGradient: "from-rose-500/10 via-rose-500/5 to-transparent",
    hoverShadow: "hover:shadow-[0_8px_30px_-4px_rgba(244,63,94,0.25)]",
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

export function BookCard({ deckId, name, flashcardsCount, onSelect, onDeleteSuccess, accentColor }: BookCardProps) {
  const accent: "primary" | "violet" | "emerald" | "amber" | "rose" = accentColor ?? getAccentForDeck(name);
  const styles = ACCENT_STYLES[accent];

  return (
    <div className="group relative" style={{ perspective: "1000px" }}>
      {/* Book wrapper */}
      <div
        onClick={onSelect}
        className={cn(
          "relative flex cursor-pointer select-none",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:-translate-y-1.5",
          styles.hoverShadow
        )}
      >
        {/* Spine (lomo) */}
        <div
          className={cn(
            "relative w-5 rounded-l-lg flex-shrink-0",
            "bg-gradient-to-b",
            styles.spine,
            "shadow-[inset_-2px_0_4px_rgba(0,0,0,0.15)]"
          )}
        >
          {/* Spine lines (simulates book binding) */}
          <div className="absolute inset-x-0 top-3 bottom-3 flex flex-col justify-between px-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-px bg-white/20" />
            ))}
          </div>
        </div>

        {/* Book cover (cubierta) */}
        <div
          className={cn(
            "relative flex-1 rounded-r-lg overflow-hidden",
            "bg-card border border-l-0",
            "min-h-[180px] flex flex-col",
            "transition-colors duration-200",
            "group-hover:border-primary/30"
          )}
        >
          {/* Pages edge ( right side) */}
          <div className="absolute right-0 top-2 bottom-2 w-1.5 flex flex-col gap-px">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 bg-muted/60 rounded-l-sm" />
            ))}
          </div>

          {/* Bookmark (marcapáginas) */}
          <div className="absolute top-0 right-6 z-10">
            <div
              className={cn(
                "w-5 h-10",
                styles.bookmark,
                "rounded-b-sm",
                "shadow-sm",
                "opacity-90 group-hover:opacity-100 transition-opacity"
              )}
            >
              {/* Bookmark notch */}
              <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[8px] border-b-card" />
            </div>
          </div>

          {/* Cover content */}
          <div className="relative flex-1 flex flex-col justify-between p-5 pr-8">
            {/* Background gradient */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              styles.coverGradient
            )} />

            {/* Title */}
            <div className="relative z-10">
              <h3 className={cn(
                "text-lg font-semibold leading-tight tracking-tight",
                "line-clamp-3 text-foreground",
                "drop-shadow-sm"
              )}>
                {name}
              </h3>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-end justify-between mt-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{flashcardsCount} tarjetas</span>
              </div>

              {/* Play button */}
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center",
                "bg-primary/10 text-primary",
                "group-hover:bg-primary group-hover:text-primary-foreground",
                "transition-all duration-200",
                "shadow-sm group-hover:shadow-md"
              )}>
                <Play className="w-4 h-4 ml-0.5" />
              </div>
            </div>
          </div>

          {/* Delete button (top-right corner) */}
          <div className="absolute top-2 right-9 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <DeckDeleteButton
              deckId={deckId}
              onDeleteSuccess={onDeleteSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
