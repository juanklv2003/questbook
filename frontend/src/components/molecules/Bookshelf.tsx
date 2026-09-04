import { cn } from "../../lib/utils"
import { Children, useRef, useState } from "react"

export interface BookshelfProps {
  children: React.ReactNode;
  className?: string;
  /** Number of shelves to display */
  shelves?: number;
  /**
   * Controlled grouping: shelf index per flattened child.
   * When omitted, children are distributed evenly (legacy behavior,
   * kept for loading skeletons and decorative empty states).
   */
  shelfOf?: (childIndex: number) => number;
  /** Stable book id per flattened child. Required for drag & drop. */
  bookIds?: (childIndex: number) => string | null;
  /**
   * Called with the final shelf + index when a book is dropped.
   * If omitted, books are not draggable.
   */
  onMoveBook?: (bookId: string, toShelf: number, toIndex: number) => void;
}

interface BookItem {
  child: React.ReactNode;
  id: string | null;
  draggable: boolean;
}

interface DropTarget {
  shelf: number;
  /** Final index in the target shelf (excluding the dragged book). */
  index: number;
  /** Id of the book the marker follows, null when appending at the end. */
  afterBookId: string | null;
}

/**
 * A wooden bookshelf with multiple shelves, dark interior, and realistic wood frame.
 * Books are grouped by `shelfOf` (persisted shelf) or distributed evenly (legacy).
 * Drag & drop uses native HTML5 (no extra dependency): small lists, mouse-first,
 * with button fallbacks on each book for keyboard/touch users.
 */
export function Bookshelf({ children, className, shelves = 3, shelfOf, bookIds, onMoveBook }: BookshelfProps) {
  const childrenArray = Children.toArray(children);
  const dndEnabled = typeof onMoveBook === "function" && typeof bookIds === "function";

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  // Mirror of the preview so drop handlers land exactly where the marker shows,
  // even if React hasn't re-rendered yet. Updated only when the index changes
  // (this guard alone kills the mousemove → setState → re-render loop).
  const dropTargetRef = useRef<DropTarget | null>(null);

  const setPreview = (next: DropTarget) => {
    const prev = dropTargetRef.current;
    if (prev !== null && prev.shelf === next.shelf && prev.index === next.index) return;
    dropTargetRef.current = next;
    setDropTarget(next);
  };

  // Group children into shelves, preserving their relative order.
  const shelfData: BookItem[][] = Array.from({ length: shelves }, () => []);
  if (shelfOf) {
    childrenArray.forEach((child, i) => {
      const raw = shelfOf(i);
      const shelf = Number.isInteger(raw) ? Math.min(shelves - 1, Math.max(0, raw)) : 0;
      const id = bookIds?.(i) ?? null;
      shelfData[shelf].push({ child, id, draggable: dndEnabled && id !== null });
    });
  } else {
    const booksPerShelf = Math.ceil(childrenArray.length / shelves);
    shelfData.forEach((_, i) => {
      childrenArray.slice(i * booksPerShelf, (i + 1) * booksPerShelf).forEach((child) => {
        shelfData[i].push({ child, id: null, draggable: false });
      });
    });
  }

  /** Index of a book inside its shelf, ignoring the dragged book. */
  const indexExcludingDragged = (shelfBooks: BookItem[], id: string | null): number =>
    shelfBooks.filter((b) => b.id !== draggedIdRef.current).findIndex((b) => b.id === id);

  const handleBookDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    draggedIdRef.current = id;
    setDraggedId(id);
  };

  const handleBookDragEnd = () => {
    draggedIdRef.current = null;
    setDraggedId(null);
    dropTargetRef.current = null;
    setDropTarget(null);
  };

  /**
   * Geometric insertion index for a shelf, measured against the live DOM.
   * Handles the left edge of the first book and the gaps between books,
   * where there is no book element under the cursor. The dragged book is
   * excluded, so the index is already final (no off-by-one on drop).
   */
  const computeShelfPreview = (
    shelfIndex: number,
    clientX: number,
    container: HTMLElement
  ): DropTarget => {
    const shelfBooks = shelfData[shelfIndex];
    const resting = shelfBooks.filter((b) => b.id !== draggedIdRef.current);
    const row = container.querySelector("[data-shelf-row]");
    const els = row
      ? Array.from(row.querySelectorAll<HTMLElement>("[data-book-id]"))
      : [];
    const live = els.filter((el) => el.getAttribute("data-book-id") !== draggedIdRef.current);
    // DOM/view-model mismatch (e.g. mid-mount): fall back to appending.
    if (live.length !== resting.length || live.length === 0) {
      return { shelf: shelfIndex, index: resting.length, afterBookId: null };
    }
    for (let i = 0; i < live.length; i++) {
      const rect = live[i].getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) {
        return { shelf: shelfIndex, index: i, afterBookId: resting[i]?.id ?? null };
      }
    }
    return { shelf: shelfIndex, index: resting.length, afterBookId: null };
  };

  /** Live-DOM shelf container owning a book element (book handlers delegate to shelf geometry). */
  const shelfContainerOf = (el: HTMLElement): HTMLElement | null =>
    el.closest("[data-shelf-container]") as HTMLElement | null;

  /** Number of books in a shelf ignoring the dragged one (final length reference). */
  const restingCountOf = (shelfIndex: number): number =>
    shelfData[shelfIndex].filter((b) => b.id !== draggedIdRef.current).length;

  /** Explicit end preview: index length with afterBookId null (append). */
  const endZoneTarget = (shelfIndex: number): DropTarget => ({
    shelf: shelfIndex,
    index: restingCountOf(shelfIndex),
    afterBookId: null,
  });

  /**
   * Single shared drop resolution: land exactly where the marker shows
   * (dropTargetRef) when it already points at this shelf; otherwise recompute
   * with the same geometry the dragover preview uses. Over and drop can never
   * disagree, including the right-end zone.
   */
  const dropAtShelf = (shelfIndex: number, clientX: number, container: HTMLElement | null) => {
    if (!dndEnabled || !onMoveBook || !draggedIdRef.current) return;
    const prev = dropTargetRef.current;
    let preview: DropTarget | null = null;
    if (prev !== null && prev.shelf === shelfIndex) {
      preview = prev;
    } else if (container) {
      preview = computeShelfPreview(shelfIndex, clientX, container);
    }
    if (!preview) return;
    const bookId = draggedIdRef.current;
    handleBookDragEnd();
    onMoveBook(bookId, shelfIndex, preview.index);
  };

  const handleBookDragOver = (e: React.DragEvent, shelfIndex: number, id: string | null) => {
    if (!dndEnabled || !draggedIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    // Same geometric computation as the shelf handler, so the marker and the
    // drop always agree (left halves, gaps, and right-end alike).
    const container = shelfContainerOf(e.currentTarget as HTMLElement);
    if (container) {
      setPreview(computeShelfPreview(shelfIndex, e.clientX, container));
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    const shelfBooks = shelfData[shelfIndex];
    const base = indexExcludingDragged(shelfBooks, id);
    if (base === -1) return;
    const resting = shelfBooks.filter((b) => b.id !== draggedIdRef.current);
    const index = base + (after ? 1 : 0);
    setPreview({
      shelf: shelfIndex,
      index,
      afterBookId: index < resting.length ? (resting[index]?.id ?? null) : null,
    });
  };

  const handleBookDrop = (e: React.DragEvent, shelfIndex: number) => {
    if (!dndEnabled || !draggedIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    dropAtShelf(shelfIndex, e.clientX, shelfContainerOf(e.currentTarget as HTMLElement));
  };

  // Fires for shelf padding, empty space, and the gaps between books
  // (book handlers stopPropagation, so this never overrides a book hover).
  const handleShelfDragOver = (e: React.DragEvent, shelfIndex: number) => {
    if (!dndEnabled || !draggedIdRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setPreview(
      computeShelfPreview(shelfIndex, e.clientX, e.currentTarget as HTMLElement)
    );
  };

  const handleShelfDrop = (e: React.DragEvent, shelfIndex: number) => {
    if (!dndEnabled || !draggedIdRef.current) return;
    e.preventDefault();
    // Drop exactly where the marker shows (shared resolution with book drops).
    dropAtShelf(shelfIndex, e.clientX, e.currentTarget as HTMLElement);
  };

  // Explicit trailing end-zone: hovering it always previews the append index,
  // so the right end never depends on which book rect the cursor overlaps.
  const handleEndZoneDragOver = (e: React.DragEvent, shelfIndex: number) => {
    if (!dndEnabled || !draggedIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setPreview(endZoneTarget(shelfIndex));
  };

  const handleEndZoneDrop = (e: React.DragEvent, shelfIndex: number) => {
    if (!dndEnabled || !draggedIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    dropAtShelf(shelfIndex, e.clientX, shelfContainerOf(e.currentTarget as HTMLElement));
  };

  return (
    <div className={cn("relative", className)}>
      {/* Main wooden frame */}
      <div className="relative rounded-lg overflow-hidden shadow-[0_12px_60px_-12px_rgba(60,30,10,0.35)]">
        {/* Top frame - thick wooden bar */}
        <div className="h-6 bg-gradient-to-b from-[#8B5A2B] via-[#A0522D] to-[#6B3E1F] relative">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1 left-[5%] right-[10%] h-px bg-[#5D3A1A]/60" />
            <div className="absolute top-2 left-[15%] right-[5%] h-px bg-[#5D3A1A]/40" />
            <div className="absolute top-3 left-[8%] right-[20%] h-px bg-[#5D3A1A]/50" />
          </div>
          {/* Highlight on top edge */}
          <div className="absolute inset-x-0 top-0 h-px bg-[#C4884D]/60" />
        </div>

        {/* Side frames + shelves */}
        <div className="flex">
          {/* Left frame */}
          <div className="w-5 bg-gradient-to-r from-[#8B5A2B] via-[#A0522D] to-[#6B3E1F] relative flex-shrink-0">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute left-1.5 top-[10%] bottom-[10%] w-px bg-[#5D3A1A]/50" />
            </div>
            <div className="absolute inset-y-0 right-0 w-px bg-[#5D3A1A]/60" />
          </div>

          {/* Interior - dark background with shelves */}
          <div className="flex-1 bg-gradient-to-b from-[#3D2317] via-[#2D1810] to-[#3D2317]">
            {shelfData.map((shelfBooks, shelfIndex) => {
              const isOverShelf = dndEnabled && dropTarget?.shelf === shelfIndex;
              return (
              <div key={shelfIndex}>
                {/* Shelf content */}
                <div
                  data-shelf-container
                  className={cn(
                    "relative px-4 h-[180px] flex flex-col justify-end rounded-sm",
                    isOverShelf && "ring-2 ring-inset ring-background/40 bg-background/5"
                  )}
                  onDragOver={dndEnabled ? (e) => handleShelfDragOver(e, shelfIndex) : undefined}
                  onDrop={dndEnabled ? (e) => handleShelfDrop(e, shelfIndex) : undefined}
                  aria-label={dndEnabled ? `Balda ${shelfIndex + 1}: suelta aquí para mover el libro` : `Balda ${shelfIndex + 1}`}
                >
                  {/* Back panel subtle texture */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#4A2C1A]/30 to-transparent" />
                  </div>

                  {/* Books on this shelf - base sits flush on shelf board.
                      Insertion markers are absolute overlays (pointer-events-none)
                      so they never displace books mid-drag: that displacement
                      was the left-reorder flicker loop (marker pushes book →
                      cursor halves flip → marker jumps). */}
                  <div data-shelf-row className="relative flex items-end gap-1 pb-0">
                    {shelfBooks.map((book, bookIndex) => {
                      const excludingIndex = indexExcludingDragged(shelfBooks, book.id);
                      const restingCount = shelfBooks.filter((b) => b.id !== draggedIdRef.current).length;
                      const showMarkerBefore =
                        isOverShelf && dropTarget !== null && dropTarget.index === excludingIndex;
                      const showMarkerAfter =
                        isOverShelf &&
                        dropTarget !== null &&
                        dropTarget.index >= restingCount &&
                        excludingIndex === restingCount - 1;
                      return (
                      <div key={book.id ?? `legacy-${shelfIndex}-${bookIndex}`} className="relative flex items-end">
                        {showMarkerBefore && (
                          <div className="pointer-events-none absolute -left-2 top-6 bottom-6 w-1 rounded-full bg-background/50" aria-hidden="true" />
                        )}
                        {showMarkerAfter && (
                          <div className="pointer-events-none absolute -right-2 top-6 bottom-6 w-1 rounded-full bg-background/50" aria-hidden="true" />
                        )}
                        <div
                          draggable={book.draggable}
                          data-book-id={book.id ?? undefined}
                          onDragStart={book.draggable && book.id ? (e) => handleBookDragStart(e, book.id as string) : undefined}
                          onDragEnd={book.draggable ? handleBookDragEnd : undefined}
                          onDragOver={book.draggable ? (e) => handleBookDragOver(e, shelfIndex, book.id) : undefined}
                          onDrop={book.draggable ? (e) => handleBookDrop(e, shelfIndex) : undefined}
                          title={book.draggable ? "Arrastra para mover de balda o reordenar" : undefined}
                          aria-grabbed={book.draggable && draggedId === book.id ? true : undefined}
                          className={cn(
                            // Relative + lifted on hover/focus so the book's hover
                            // card (z-50 inside) floats ABOVE the wooden shelf
                            // boards (z-0, rendered later in DOM). The tilt
                            // transform below creates a stacking context that
                            // would otherwise trap the card under later siblings.
                            "relative flex-shrink-0 origin-bottom hover:z-30 focus-within:z-30",
                            // Slight random tilt for realism (pivot at base so it never floats)
                            bookIndex % 3 === 0 && "rotate-[-1deg]",
                            bookIndex % 3 === 1 && "rotate-[0.5deg]",
                            bookIndex % 3 === 2 && "rotate-[-0.5deg]",
                            book.draggable && "cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm",
                            draggedId === book.id && "opacity-40"
                          )}
                        >
                          {book.child}
                        </div>
                      </div>
                      );
                    })}
                    {/* Trailing end-zone: stable explicit target for "drop at the end".
                        Always rendered while DnD is on; flex-1 consumes leftover
                        space only, so books never shift (overlay markers stay
                        layout-free, no flicker). Background-only highlight. */}
                    {dndEnabled && (
                      <div
                        data-shelf-end-zone
                        aria-hidden="true"
                        onDragOver={(e) => handleEndZoneDragOver(e, shelfIndex)}
                        onDrop={(e) => handleEndZoneDrop(e, shelfIndex)}
                        className={cn(
                          "flex-1 self-stretch rounded-sm",
                          isOverShelf &&
                            dropTarget !== null &&
                            dropTarget.index >= restingCountOf(shelfIndex) &&
                            "bg-background/10"
                        )}
                      />
                    )}
                    {/* Empty shelf: keep a static in-flow hint (no books to displace,
                        so no flicker risk here). Non-empty end markers render
                        anchored to the last book above. */}
                    {/* Empty space fills the rest */}
                    {shelfBooks.length === 0 && !isOverShelf && (
                      <div className="text-[#8B6B4A]/30 text-sm italic">
                        Estantería vacía...
                      </div>
                    )}
                    {shelfBooks.length === 0 && isOverShelf && (
                      <div className="text-background/70 text-sm italic">
                        Suelta aquí para mover a la balda {shelfIndex + 1}
                      </div>
                    )}
                  </div>
                </div>

                {/* Wooden shelf board (kept at z-0 so a hovered/focused
                    book with hover:z-30 always floats above it). */}
                {shelfIndex < shelves - 1 && (
                  <div className="relative h-4 z-0">
                    {/* Main shelf board */}
                    <div className="absolute inset-x-0 h-full bg-gradient-to-b from-[#A0522D] via-[#8B5A2B] to-[#6B3E1F]" />
                    {/* Top highlight */}
                    <div className="absolute inset-x-0 top-0 h-px bg-[#C4884D]/50" />
                    {/* Bottom shadow */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-[#3D2317]/80" />
                    {/* Wood grain */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-1 left-[10%] right-[15%] h-px bg-[#5D3A1A]/40" />
                      <div className="absolute top-2 left-[20%] right-[8%] h-px bg-[#5D3A1A]/30" />
                    </div>
                    {/* Shadow under shelf */}
                    <div className="absolute -bottom-1 inset-x-0 h-2 bg-gradient-to-b from-black/20 to-transparent" />
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* Right frame */}
          <div className="w-5 bg-gradient-to-l from-[#8B5A2B] via-[#A0522D] to-[#6B3E1F] relative flex-shrink-0">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute right-1.5 top-[10%] bottom-[10%] w-px bg-[#5D3A1A]/50" />
            </div>
            <div className="absolute inset-y-0 left-0 w-px bg-[#5D3A1A]/60" />
          </div>
        </div>

        {/* Bottom frame - thick wooden bar */}
        <div className="h-7 bg-gradient-to-b from-[#8B5A2B] via-[#7A4E2A] to-[#5D3A1A] relative">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1.5 left-[5%] right-[10%] h-px bg-[#4A2C1A]/50" />
            <div className="absolute top-2.5 left-[12%] right-[8%] h-px bg-[#4A2C1A]/40" />
            <div className="absolute top-3.5 left-[8%] right-[15%] h-px bg-[#4A2C1A]/50" />
          </div>
          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-[#C4884D]/40" />
          {/* Bottom shadow */}
          <div className="absolute -bottom-3 inset-x-2 h-3 bg-gradient-to-b from-black/15 to-transparent" />
        </div>
      </div>
    </div>
  )
}
