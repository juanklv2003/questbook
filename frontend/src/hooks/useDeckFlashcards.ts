import { useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import type { Flashcard, Deck } from '../types';
import { useLanguage } from '../i18n/LanguageContext';


export function useDeckFlashcards(deckId: string | null) {
  const { t } = useLanguage();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) {
      setFlashcards([]);
      setDeck(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const requestDeckId = deckId;

    const fetchFlashcards = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.get(`/decks/${requestDeckId}/flashcards`);
        if (cancelled) return;
        setFlashcards(response.data.flashcards);
        setDeck(response.data.deck);
      } catch (err: unknown) {
        if (cancelled) return;
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'An unknown error occurred';
        setError(errorMessage || t('deck.flashError'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchFlashcards();

    return () => {
      cancelled = true;
    };
    // NOTE: `t` intentionally excluded — refetching on locale toggle would
    // flash the study loading state (and new array identity could reset the
    // session hook). The fallback is translated at fetch time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  return { flashcards, deck, isLoading, error, setFlashcards };
}
