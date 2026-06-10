import { useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import type { Flashcard } from '../types';


export function useDeckFlashcards(deckId: string | null) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) return;

    const fetchFlashcards = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiClient.get(`/decks/${deckId}/flashcards`);
        setFlashcards(response.data.flashcards);
        setDeck(response.data.deck);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Error loading flashcards');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlashcards();
  }, [deckId]);

  return { flashcards, deck, isLoading, error, setFlashcards };
}
