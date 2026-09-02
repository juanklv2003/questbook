import { cn } from "../../lib/utils"
import { BookOpen } from "lucide-react"
import { DeckDeleteButton } from "../atoms/DeckDeleteButton"

export interface BookCardProps {
  deckId: string;
  name: string;
  flashcardsCount: number;
  onSelect: () => void;
  onDeleteSuccess: () => void;
  /** Color accent for the book spine. */
  accentColor?: "primary" | "violet" | "emerald" | "amber" | "rose";
  /** Show as horizontal book (laying down) */
  horizontal?: boolean;
}

const ACCENT_STYLES = {
  primary: {
    spine: "from-primary via-primary/90 to-primary/80",
    spineDark: "from-primary/80 to-primary/60",
    hover: "hover:shadow-[0_4px_20px_-2px_hsl(var(--primary)/0.4)]",
    bookmark: "bg-primary",
  },
  violet: {
    spine: "from-violet-600 via-violet-500 to-violet-400",
    spineDark: "from-violet-600/80 to-violet-500/60",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(139,92,246,0.4)]",
    bookmark: "bg-violet-500",
  },
  emerald: {
    spine: "from-emerald-600 via-emerald-500 to-emerald-400",
    spineDark: "from-emerald-600/80 to-emerald-500/60",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(16,185,129,0.4)]",
    bookmark: "bg-emerald-500",
  },
  amber: {
    spine: "from-amber-600 via-amber-500 to-amber-400",
    spineDark: "from-amber-600/80 to-amber-500/60",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(245,158,11,0.4)]",
    bookmark: "bg-amber-500",
  },
  rose: {
    spine: "from-rose-600 via-rose-500 to-rose-400",
    spineDark: "from-rose-600/80 to-rose-500/60",
    hover: "hover:shadow-[0_4px_20px_-2px_rgba(244,63,94,0.4)]",
    bookmark: "bg-rose-500",
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

// Deterministic width based on deck name
function getWidthForDeck(name: string): string {
  const widths = ["w-8", "w-9", "w-10", "w-11", "w-12"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return widths[Math.abs(hash) % widths.length];
}

export function BookCard({ deckId, name, flashcardsCount, onSelect, onDeleteSuccess, accentColor, horizontal }: BookCardProps) {
  const accent = accentColor ?? getAccentForDeck(name);
  const styles = ACCENT_STYLES[accent];
  const height = getHeightForDeck(name);
  const width = getWidthForDeck(name);

  // Horizontal book (laying down)
  if (horizontal) {
    return (
      <div className="group relative">
        <div
          onClick={onSelect}
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
            {/* Book binding lines */}
            <div className="absolute left-1 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />

            {/* Title (horizontal) */}
            <span className="text-[10px] font-semibold text-white/90 truncate flex-1 drop-shadow-sm">
              {name}
            </span>

            {/* Card count */}
            <div className="flex items-center gap-1 text-[9px] text-white/70">
              <BookOpen className="w-2.5 h-2.5" />
              <span>{flashcardsCount}</span>
            </div>

            {/* Pages edge */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/30 via-white/20 to-white/30" />
          </div>

          {/* Delete button */}
          <div className="absolute -top-1 -right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <DeckDeleteButton deckId={deckId} onDeleteSuccess={onDeleteSuccess} />
          </div>
        </div>
      </div>
    );
  }

  // Vertical book (standing up) - spine view
  return (
    <div className="group relative">
      <div
        onClick={onSelect}
        className={cn(
          "relative cursor-pointer select-none",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:-translate-y-1",
          styles.hover
        )}
      >
        {/* Bookmark (marcapáginas) */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
          <div className={cn(
            "w-3 h-6",
            styles.bookmark,
            "rounded-b-sm",
            "shadow-sm",
            "opacity-80 group-hover:opacity-100 transition-opacity"
          )}>
            {/* Bookmark notch */}
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
          {/* Top decoration */}
          <div className="w-4 h-0.5 bg-white/30 rounded-full" />

          {/* Title (vertical) */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <span className={cn(
              "text-white font-semibold drop-shadow-sm",
              "writing-vertical-rl text-nowrap",
              "text-[10px] leading-none tracking-wide",
              "max-h-full"
            )} style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
              {name.length > 12 ? name.slice(0, 12) + "…" : name}
            </span>
          </div>

          {/* Bottom decoration */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-3 h-px bg-white/20" />
            <div className="w-4 h-0.5 bg-white/30 rounded-full" />
          </div>

          {/* Pages edge (right side) */}
          <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-gradient-to-b from-white/40 via-white/25 to-white/40" />
        </div>

        {/* Delete button */}
        <div className="absolute -top-1 -right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <DeckDeleteButton deckId={deckId} onDeleteSuccess={onDeleteSuccess} />
        </div>
      </div>
    </div>
  )
}
