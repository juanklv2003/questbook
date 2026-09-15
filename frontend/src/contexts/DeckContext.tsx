import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../lib/axios';
import { useAuth } from './AuthContext';
import { DeckContext } from './deck-context';
import type { Deck } from '../types';

interface ApiErrorLike {
  response?: { data?: { error?: unknown } };
  message?: string;
}

/**
 * Global library state: ONE GET /decks per session, shared by the dashboard
 * and the global panels (previously `useDecks` fetched once per hook
 * instance → duplicate request on app mount).
 */
export function DeckProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guards concurrent fetches: StrictMode double-effect + repeated
  // study-exit triggers collapse into a single in-flight GET /decks.
  const inFlightRef = useRef(false);
  // Mirrors auth at resolution time so a late response never repopulates
  // the cache after logout (no cross-account flash). Synced in an effect
  // (never during render) per react-hooks/refs.
  const authRef = useRef(isAuthenticated);
  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const applyError = (err: unknown) => {
    const apiError = err as ApiErrorLike;
    const serverMessage = apiError.response?.data?.error;
    setError(
      (typeof serverMessage === 'string' && serverMessage) ||
        (err instanceof Error ? err.message : null) ||
        'Error al cargar libros'
    );
  };

  // No session (login screen): nothing to fetch.
  // Stable identity (useCallback) so consumers can depend on `refetch`
  // without re-firing their effects on every render.
  const fetchDecks = useCallback(async () => {
    if (!isAuthenticated) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const response = await apiClient.get('/decks');
      if (!authRef.current) return;
      setDecks(response.data);
      setError(null);
    } catch (err: unknown) {
      if (!authRef.current) return;
      applyError(err);
    } finally {
      inFlightRef.current = false;
      if (authRef.current) setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch + automatic re-fetch on login. Fetch results settle in
  // async continuations (never sync in the effect body) — avoids cascading
  // renders. The sole sync write is the logout clear below, which the spec
  // requires to be immediate. Logout clears the cache so the next account
  // never sees the previous account's decks.
  useEffect(() => {
    if (!isAuthenticated) {
      // Spec Logout Clear: cached decks MUST empty immediately on logout so
      // the next account never flashes the previous list. The synchronous
      // clear on this single auth transition is intentional (one extra
      // render, no cascade loop — decks are server state, not derivable).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDecks([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    void fetchDecks();
  }, [isAuthenticated, fetchDecks]);

  return (
    <DeckContext.Provider value={{ decks, isLoading, error, setDecks, refetch: fetchDecks }}>
      {children}
    </DeckContext.Provider>
  );
}