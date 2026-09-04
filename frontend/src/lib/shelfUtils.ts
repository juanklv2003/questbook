import type { Deck } from "../types";

export const SHELF_COUNT = 3;
export const MIN_SHELF_INDEX = 0;
export const MAX_SHELF_INDEX = SHELF_COUNT - 1;

export interface ShelfMove {
  id: string;
  shelfIndex: number;
  position: number;
}

export function getShelfOf(deck: Deck): number {
  const raw = deck.shelfIndex ?? deck.shelf_index ?? 0;
  if (!Number.isInteger(raw)) return 0;
  return Math.min(MAX_SHELF_INDEX, Math.max(MIN_SHELF_INDEX, raw));
}

function getPositionOf(deck: Deck): number | null {
  const raw = deck.position;
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : null;
}

/**
 * Groups decks into shelves ordered left-to-right.
 * Sort within each shelf is stable by `position`; decks without a position
 * keep the incoming (server: created_at DESC) order. Fallback shelf is 0.
 */
export function groupDecksByShelf(decks: Deck[], shelfCount: number = SHELF_COUNT): Deck[][] {
  const shelves: { deck: Deck; incoming: number }[][] = Array.from({ length: shelfCount }, () => []);
  decks.forEach((deck, incoming) => {
    shelves[getShelfOf(deck)].push({ deck, incoming });
  });
  return shelves.map((shelf) =>
    shelf
      .sort((a, b) => {
        const pa = getPositionOf(a.deck);
        const pb = getPositionOf(b.deck);
        if (pa === null && pb === null) return a.incoming - b.incoming;
        if (pa === null) return 1;
        if (pb === null) return -1;
        if (pa !== pb) return pa - pb;
        return a.incoming - b.incoming;
      })
      .map((entry) => entry.deck)
  );
}

export interface ComputedMove {
  decks: Deck[];
  changes: ShelfMove[];
}

/**
 * Returns the deck list after moving one deck to (toShelf, toIndex),
 * renumbering positions 0..n-1 in the affected shelves.
 * `changes` contains only decks whose shelf/position actually changed,
 * ready to PATCH one by one. Pure function (no side effects).
 */
export function computeMove(
  decks: Deck[],
  deckId: string,
  toShelf: number,
  toIndex: number,
  shelfCount: number = SHELF_COUNT
): ComputedMove {
  const targetShelf = Math.min(shelfCount - 1, Math.max(0, toShelf));
  const shelves = groupDecksByShelf(decks, shelfCount);
  const fromShelf = shelves.findIndex((shelf) => shelf.some((d) => d.id === deckId));
  if (fromShelf === -1) return { decks, changes: [] };

  const moving = shelves[fromShelf].find((d) => d.id === deckId) as Deck;
  const without = shelves.map((shelf, i) =>
    i === fromShelf ? shelf.filter((d) => d.id !== deckId) : [...shelf]
  );
  const clampedIndex = Math.min(Math.max(0, toIndex), without[targetShelf].length);
  without[targetShelf].splice(clampedIndex, 0, moving);

  const before = new Map(decks.map((d) => [d.id, { shelf: getShelfOf(d), pos: getPositionOf(d) }]));
  const next: Deck[] = [];
  const changes: ShelfMove[] = [];
  without.forEach((shelf, shelfIdx) => {
    shelf.forEach((deck, pos) => {
      const prev = before.get(deck.id);
      const updated: Deck = { ...deck, shelfIndex: shelfIdx, position: pos };
      // Report a change when the shelf differs, or the position differs from
      // the last persisted one (null counts as unknown → must persist).
      if (!prev || prev.shelf !== shelfIdx || prev.pos !== pos) {
        changes.push({ id: deck.id, shelfIndex: shelfIdx, position: pos });
      }
      next.push(updated);
    });
  });

  // Keep a stable flat order (shelf by shelf) so rendering stays predictable.
  return { decks: next, changes };
}
