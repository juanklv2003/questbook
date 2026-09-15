import { useDeckContext } from '../contexts/deck-context';

/**
 * Access to the global book state (see DeckContext). The provider fetches
 * ONCE per session; this hook only shares the state. Single access path:
 * every consumer (dashboard, panels, App-level guards) goes through here.
 */
export function useDecks() {
  const { decks, isLoading, error, setDecks, refetch } = useDeckContext();
  return { decks, isLoading, error, setDecks, refetch };
}
