import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Deck } from '../types';

export interface DeckContextValue {
  decks: Deck[];
  isLoading: boolean;
  error: string | null;
  setDecks: Dispatch<SetStateAction<Deck[]>>;
  /** Re-fetches GET /decks (e.g. returning to the library after studying). */
  refetch: () => Promise<void>;
}

/** Shared deck provider context (defined here, without component, for react-refresh). */
export const DeckContext = createContext<DeckContextValue | undefined>(undefined);

export function useDeckContext(): DeckContextValue {
  const context = useContext(DeckContext);
  if (context === undefined) {
    throw new Error('useDeckContext must be used within a DeckProvider');
  }
  return context;
}