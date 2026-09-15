import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Flashcard, EvaluationResult } from '../types';
import { useEvaluator } from './useEvaluator';
import { shuffled } from '../lib/shuffle';
import apiClient from '../lib/axios';

/** Persisted partial study progress. DB is the source, localStorage is offline fallback. */
export interface SavedStudyProgress {
  currentIndex: number;
  resultsById: Record<string, boolean>;
  updatedAt: number;
  /** Hash of the deck's card ids — stale hashes are ignored, never auto-deleted. */
  hash: string;
  finished?: boolean;
}

/** Offer shown when a saved session is found on mount. */
export interface PendingResume {
  /** 1-based position to resume at (clamped). */
  current: number;
  total: number;
  answered: number;
}

const PATCH_DEBOUNCE_MS = 600;

const storageKey = (deckId: string) => `andel:study:${deckId}`;

/** Small djb2 hash over the card ids — enough to detect a regenerated deck. */
function hashIds(ids: string[]): string {
  const s = ids.join('|');
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return `${ids.length}:${s.length}:${h.toString(36)}`;
}

/**
 * Local fallback read. Never deletes: stale, pristine or finished snapshots
 * simply return null so the UI ignores them until the user acts explicitly.
 */
function readLocal(deckId: string, tarjetas: Flashcard[]): SavedStudyProgress | null {
  if (!deckId || tarjetas.length === 0) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(deckId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedStudyProgress>;
    if (
      typeof parsed.currentIndex !== 'number' ||
      typeof parsed.updatedAt !== 'number' ||
      !parsed.resultsById ||
      typeof parsed.resultsById !== 'object' ||
      typeof parsed.hash !== 'string'
    ) {
      return null;
    }
    if (parsed.finished === true) return null;
    if (parsed.hash !== hashIds(tarjetas.map((t) => t.id))) return null;
    const answered = Object.keys(parsed.resultsById).length;
    if ((parsed.currentIndex <= 0 && answered === 0) || parsed.currentIndex >= tarjetas.length) {
      return null;
    }
    return {
      currentIndex: Math.min(Math.max(0, parsed.currentIndex), tarjetas.length - 1),
      resultsById: parsed.resultsById as Record<string, boolean>,
      updatedAt: parsed.updatedAt,
      hash: parsed.hash,
      finished: false,
    };
  } catch {
    return null;
  }
}

function writeLocal(deckId: string, snapshot: SavedStudyProgress): void {
  try {
    window.localStorage.setItem(storageKey(deckId), JSON.stringify(snapshot));
  } catch {
    // Private mode / quota: study still works in memory and on the server.
  }
}

function clearLocal(deckId: string): void {
  try {
    window.localStorage.removeItem(storageKey(deckId));
  } catch {
    // Ignore storage errors.
  }
}

interface RemoteSnapshot {
  currentIndex: number;
  resultsById: Record<string, boolean>;
  hash: string;
  finished: boolean;
  updatedAt: number;
}

function toSnapshot(remote: RemoteSnapshot, total: number): SavedStudyProgress | null {
  if (remote.finished) return null;
  const answered = Object.keys(remote.resultsById).length;
  if ((remote.currentIndex <= 0 && answered === 0) || remote.currentIndex >= total) return null;
  return {
    currentIndex: Math.min(Math.max(0, remote.currentIndex), total - 1),
    resultsById: remote.resultsById,
    updatedAt: remote.updatedAt,
    hash: remote.hash,
    finished: false,
  };
}

/**
 * Study session state with DB-backed resume and localStorage offline fallback.
 *
 * New signature: useFlashcardStudy(deckId, tarjetas). The legacy single-arg
 * call useFlashcardStudy(tarjetas) still works (DB sync disabled, local only).
 */
export function useFlashcardStudy(deckIdOrTarjetas: string | Flashcard[], maybeTarjetas?: Flashcard[]) {
  const deckId = typeof deckIdOrTarjetas === 'string' ? deckIdOrTarjetas : '';
  const tarjetas: Flashcard[] = typeof deckIdOrTarjetas === 'string'
    ? (maybeTarjetas ?? [])
    : deckIdOrTarjetas;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [respuestaUsuario, setRespuestaUsuario] = useState('');
  const [feedbackIA, setFeedbackIA] = useState<EvaluationResult | null>(null);
  // Result per card (keyed by id: survives reorders and avoids syncing
  // lengths if the deck changes). Missing key = pending.
  const [resultsById, setResultsById] = useState<Record<string, boolean>>({});
  // Last deckProgress reported by POST /evaluate — the shared deck store
  // refreshes via study-exit refetch, so callers can ignore this (optimistic only).
  const [lastDeckProgress, setLastDeckProgress] = useState<number | null>(null);

  // While resume is unresolved, autosave is paused so the pristine 0/0 state
  // never overwrites the saved snapshot before the user picks Resume/Restart.
  const [savedSnapshot, setSavedSnapshot] = useState<SavedStudyProgress | null>(null);
  const [resumeResolved, setResumeResolved] = useState(() => !deckId);
  const [sessionLoading, setSessionLoading] = useState(() => Boolean(deckId));
  const [isOffline, setIsOffline] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const remoteCache = useRef<RemoteSnapshot | null>(null);
  const remoteChecked = useRef(false);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { evaluateAnswer, isEvaluating, error: evaluationError, quotaExceeded, overloaded, clearError } = useEvaluator();

  // Card id order. null = natural deck order. Set by restart({ reshuffle }).
  const [order, setOrder] = useState<string[] | null>(null);

  // Order-resolved deck view. Cards missing from the order (deck regenerated
  // mid-session) are appended so no card is ever lost.
  const orderedTarjetas = useMemo(() => {
    if (!order) return tarjetas;
    const byId = new Map(tarjetas.map((t) => [t.id, t]));
    const mapped = order
      .map((id) => byId.get(id))
      .filter((t): t is Flashcard => t !== undefined);
    if (mapped.length !== tarjetas.length) {
      const seen = new Set(mapped.map((t) => t.id));
      for (const t of tarjetas) {
        if (!seen.has(t.id)) mapped.push(t);
      }
    }
    return mapped;
  }, [tarjetas, order]);

  const tarjetaActual = orderedTarjetas[currentIndex];
  const progreso = currentIndex + 1;
  const haTerminado = currentIndex >= orderedTarjetas.length;
  const answeredCount = useMemo(() => Object.keys(resultsById).length, [resultsById]);
  const remainingCount = Math.max(0, orderedTarjetas.length - answeredCount);

  // Fetch the DB session once per deck. 404 = no saved session (normal).
  // Any other failure = offline, fall back to localStorage.
  useEffect(() => {
    if (!deckId) {
      remoteChecked.current = true;
      setSessionLoading(false);
      setResumeResolved(true);
      return;
    }
    remoteChecked.current = false;
    remoteCache.current = null;
    setIsOffline(false);
    setSessionError(false);
    setSessionLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get(`/decks/${deckId}/session`);
        const s = res.data?.session;
        if (cancelled || !s) return;
        const results = (s.results ?? {}) as Record<string, boolean>;
        remoteCache.current = {
          currentIndex: typeof s.currentIndex === 'number' ? s.currentIndex : 0,
          resultsById: results && typeof results === 'object' ? results : {},
          hash: typeof s.flashcardsHash === 'string' ? s.flashcardsHash : '',
          finished: s.finished === true,
          updatedAt: s.updatedAt ? Date.parse(s.updatedAt) : Date.now(),
        };
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number }; config?: { url?: string } })?.response?.status;
        const url = (err as { config?: { url?: string } })?.config?.url ?? `/decks/${deckId}/session`;
        console.warn(`[study-session] GET ${url} failed`, { status });
        if (status === 404) {
          // No saved session (or old backend without session routes): normal, not offline.
        } else if (status === undefined) {
          // Network Error: no response from server.
          setIsOffline(true);
        } else {
          // 401/403/500...: server reachable, sync failed.
          setSessionError(true);
        }
        remoteCache.current = null;
      } finally {
        if (!cancelled) {
          remoteChecked.current = true;
          setSessionLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // Resolve the resume offer once cards are loaded and the remote check finished.
  useEffect(() => {
    if (!deckId || resumeResolved || !remoteChecked.current || tarjetas.length === 0) return;
    const currentHash = hashIds(tarjetas.map((t) => t.id));
    const remote = remoteCache.current;
    let candidate: SavedStudyProgress | null = null;
    if (remote && (remote.hash === '' || remote.hash === currentHash)) {
      candidate = toSnapshot(remote, tarjetas.length);
      // Mirror a valid remote snapshot into the local fallback for offline use.
      if (candidate) writeLocal(deckId, candidate);
    }
    if (!candidate) {
      candidate = readLocal(deckId, tarjetas);
    }
    if (candidate) {
      setSavedSnapshot(candidate);
      // Keep resumeResolved false so the banner shows and autosave stays paused.
    } else {
      setSavedSnapshot(null);
      setResumeResolved(true);
    }
  }, [deckId, tarjetas, resumeResolved, sessionLoading]);

  // Persist on every change: localStorage immediately (offline fallback),
  // DB with debounce. Finishing never deletes — it marks finished=true.
  useEffect(() => {
    if (!deckId || !resumeResolved || tarjetas.length === 0) return;
    const hash = hashIds(tarjetas.map((t) => t.id));
    const answered = Object.keys(resultsById).length;
    const finished = currentIndex >= tarjetas.length;

    if (!finished && currentIndex === 0 && answered === 0) {
      // Pristine: nothing worth persisting yet (no row created, nothing deleted).
      return;
    }

    writeLocal(deckId, {
      currentIndex: finished ? tarjetas.length : currentIndex,
      resultsById,
      updatedAt: Date.now(),
      hash,
      finished,
    });

    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(() => {
      apiClient
        .patch(`/decks/${deckId}/session`, {
          currentIndex: finished ? tarjetas.length : currentIndex,
          results: resultsById,
          flashcardsHash: hash,
          finished,
        })
        .then(() => {
          // Sync recovered: clear any previous offline/sync notice.
          setIsOffline(false);
          setSessionError(false);
        })
        .catch((err: unknown) => {
          const status = (err as { response?: { status?: number }; config?: { url?: string } })?.response?.status;
          const url = (err as { config?: { url?: string } })?.config?.url ?? `/decks/${deckId}/session`;
          console.warn(`[study-session] PATCH ${url} failed`, { status });
          if (status === 404) {
            // Old backend without session routes: local fallback already holds the snapshot.
            return;
          }
          if (status === undefined) {
            // Network Error: no response from server.
            setIsOffline(true);
            return;
          }
          // 401/403/500...: server reachable, sync failed.
          setSessionError(true);
        });
    }, PATCH_DEBOUNCE_MS);

    return () => {
      if (patchTimer.current) clearTimeout(patchTimer.current);
    };
  }, [deckId, currentIndex, resultsById, tarjetas, resumeResolved]);

  const pendingResume: PendingResume | null = useMemo(() => {
    if (resumeResolved || !savedSnapshot) return null;
    return {
      current: Math.min(savedSnapshot.currentIndex + 1, tarjetas.length),
      total: tarjetas.length,
      answered: Object.keys(savedSnapshot.resultsById).length,
    };
  }, [resumeResolved, savedSnapshot, tarjetas.length]);

  const resumeProgress = useCallback(() => {
    setSavedSnapshot((saved) => {
      if (saved) {
        setCurrentIndex(saved.currentIndex);
        setResultsById(saved.resultsById);
      }
      return null;
    });
    setRespuestaUsuario('');
    setFeedbackIA(null);
    clearError();
    setResumeResolved(true);
  }, [clearError]);

  // Explicit user action only: clears local fallback and the DB row.
  // resultsById is keyed by card id, so it needs no remap on reorder —
  // restart simply drops it along with the index and the input state.
  const restart = useCallback(async ({ reshuffle }: { reshuffle: boolean }) => {
    if (deckId) {
      clearLocal(deckId);
      try {
        await apiClient.delete(`/decks/${deckId}/session`);
      } catch {
        // 404 (no row) or offline: local state still resets.
      }
    }
    if (patchTimer.current) clearTimeout(patchTimer.current);
    setSavedSnapshot(null);
    setCurrentIndex(0);
    setResultsById({});
    setRespuestaUsuario('');
    setFeedbackIA(null);
    clearError();
    setOrder(reshuffle ? shuffled(tarjetas.map((t) => t.id)) : null);
    setResumeResolved(true);
  }, [deckId, clearError, tarjetas]);

  // Legacy entry point: plain restart without reshuffling.
  const restartProgress = useCallback(async () => {
    await restart({ reshuffle: false });
  }, [restart]);

  const evaluar = async () => {
    if (!tarjetaActual || !respuestaUsuario.trim()) return;

    try {
      const result = await evaluateAnswer(
        tarjetaActual.id,
        respuestaUsuario
      );

      setResultsById(prev => ({ ...prev, [tarjetaActual.id]: result.isCorrect }));
      setFeedbackIA(result);
      // Optimistic progress hint: trivial to consume (number|null). The
      // shared store refreshes via study-exit refetch, so ignoring it is fine.
      if (typeof result.deckProgress === 'number' || result.deckProgress === null) {
        setLastDeckProgress(result.deckProgress ?? null);
      }
    } catch {
      // Evaluation errors (AI down, invalid format, quota...) are already
      // exposed via `evaluationError` and rendered by StudyPlayer.
    }
  };

  const siguienteTarjeta = () => {
    clearError();
    setCurrentIndex(prev => prev + 1);
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  /** Jump to a card (review list, order-resolved). Keeps results untouched. */
  const goToCard = (index: number) => {
    if (index < 0 || index >= orderedTarjetas.length) return;
    clearError();
    setCurrentIndex(index);
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  const reintentar = () => {
    clearError();
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  return {
    tarjetaActual,
    orderedTarjetas,
    order,
    currentIndex,
    progreso,
    total: orderedTarjetas.length,
    haTerminado,
    respuestaUsuario,
    setRespuestaUsuario,
    evaluarRespuesta: evaluar,
    isEvaluating,
    feedbackIA,
    evaluationError,
    quotaExceeded,
    overloaded,
    clearEvaluationError: clearError,
    siguienteTarjeta,
    reintentar,
    resultsById,
    goToCard,
    // Partial-progress persistence:
    pendingResume,
    resumeProgress,
    restartProgress,
    restart,
    answeredCount,
    remainingCount,
    lastDeckProgress,
    sessionLoading,
    isOffline,
    sessionError,
  };
}
