import { useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import type { Deck } from '../types';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/decks');
        // Assuming API returns array of decks, mapping missing flashcardsCount if needed, though real API should probably return it.
        // For now, since findAll query returns decks without count, we default to 0 or we might need to adjust backend.
        // Let's just set response.data directly.
        setDecks(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Error al cargar libros');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDecks();
  }, []);

  return { decks, isLoading, error, setDecks };
}
