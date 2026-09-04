import * as React from "react";
import apiClient from "../lib/axios";
import type { Deck } from "../types";
import { SHELF_COUNT, computeMove, groupDecksByShelf } from "../lib/shelfUtils";

/**
 * Shelf state + persistence for the bookshelf.
 * All fetches live here (never in atoms/molecules/organisms):
 * optimistic reorder in UI, PATCH per changed deck, rollback on failure.
 */
export function useDeckShelf(
  decks: Deck[],
  setDecks: React.Dispatch<React.SetStateAction<Deck[]>>
) {
  const [isPersisting, setIsPersisting] = React.useState(false);
  const [shelfError, setShelfError] = React.useState<string | null>(null);
  const persistSeq = React.useRef(0);

  const shelves = React.useMemo(() => groupDecksByShelf(decks, SHELF_COUNT), [decks]);

  const persistChanges = React.useCallback(
    async (snapshot: Deck[], changes: { id: string; shelfIndex: number; position: number }[]) => {
      if (changes.length === 0) return;
      const seq = ++persistSeq.current;
      setIsPersisting(true);
      try {
        await Promise.all(
          changes.map((change) =>
            apiClient.patch(`/decks/${change.id}/shelf`, {
              shelf_index: change.shelfIndex,
              position: change.position,
            })
          )
        );
      } catch (err: unknown) {
        // Ignore stale responses from superseded moves.
        if (persistSeq.current !== seq) return;
        setDecks(snapshot);
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "No se pudo guardar el orden. Inténtalo de nuevo.";
        setShelfError(message);
      } finally {
        if (persistSeq.current === seq) setIsPersisting(false);
      }
    },
    [setDecks]
  );

  const moveDeck = React.useCallback(
    (deckId: string, toShelf: number, toIndex: number) => {
      setShelfError(null);
      const snapshot = decks;
      const { decks: next, changes } = computeMove(decks, deckId, toShelf, toIndex, SHELF_COUNT);
      if (changes.length === 0) return;
      setDecks(next);
      void persistChanges(snapshot, changes);
    },
    [decks, persistChanges, setDecks]
  );

  const locate = React.useCallback(
    (deckId: string): { shelf: number; index: number } | null => {
      for (let s = 0; s < shelves.length; s++) {
        const index = shelves[s].findIndex((d) => d.id === deckId);
        if (index !== -1) return { shelf: s, index };
      }
      return null;
    },
    [shelves]
  );

  /** Keyboard/button fallback: move one step left/right inside the same shelf. */
  const moveWithinShelf = React.useCallback(
    (deckId: string, direction: -1 | 1) => {
      const found = locate(deckId);
      if (!found) return;
      moveDeck(deckId, found.shelf, found.index + direction);
    },
    [locate, moveDeck]
  );

  /** Keyboard/button fallback: move to the end of another shelf. */
  const moveToShelf = React.useCallback(
    (deckId: string, toShelf: number) => {
      const found = locate(deckId);
      if (!found || found.shelf === toShelf) return;
      moveDeck(deckId, toShelf, shelves[toShelf]?.length ?? 0);
    },
    [locate, moveDeck, shelves]
  );

  const clearShelfError = React.useCallback(() => setShelfError(null), []);

  return {
    shelves,
    shelfCount: SHELF_COUNT,
    moveDeck,
    moveWithinShelf,
    moveToShelf,
    isPersisting,
    shelfError,
    clearShelfError,
  };
}
