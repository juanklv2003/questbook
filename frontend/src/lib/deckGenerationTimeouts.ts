import type { DeckGenerationOptions } from '../types';

const DEFAULT_DECK_TOTAL_TIMEOUT_MS = 480_000;
const DEFAULT_DECK_CLIENT_TIMEOUT_MS = DEFAULT_DECK_TOTAL_TIMEOUT_MS + 120_000;

/** PDF extraction worker timeout in the backend (`PdfTextExtractor.EXTRACT_TIMEOUT_MS`). */
const PDF_EXTRACT_SLACK_MS = 60_000;

let backendBudgetMs = DEFAULT_DECK_TOTAL_TIMEOUT_MS;
let deckGenerationClientTimeoutMs = DEFAULT_DECK_CLIENT_TIMEOUT_MS;

/** Backend wall-clock budget (`AI_DECK_TOTAL_TIMEOUT_MS`) from `GET /health`. */
export function setDeckGenerationBackendBudgetMs(ms: number): void {
  if (Number.isFinite(ms) && ms > 0) {
    backendBudgetMs = ms;
  }
}

export function setDeckGenerationClientTimeoutMs(ms: number): void {
  if (Number.isFinite(ms) && ms > 0) {
    deckGenerationClientTimeoutMs = ms;
  }
}

export function getDeckGenerationClientTimeoutMs(): number {
  return deckGenerationClientTimeoutMs;
}

/**
 * Mirror of the backend `deckBatchLimitFor` (backend/src/modules/decks/domain/
 * deckGenerationLimits.ts). Keep both in sync: if the backend changes the batch
 * size, the estimated client timeout must follow.
 */
export function estimateDeckAiBatches(
  cardCount: number,
  difficulty: DeckGenerationOptions['difficulty']
): number {
  const limit =
    cardCount <= 15 ? cardCount : difficulty === 'hard' ? (cardCount > 30 ? 20 : 15) : 20;
  return Math.max(1, Math.ceil(cardCount / Math.max(1, limit)));
}

/**
 * Axios timeout for the direct upload: PDF upload + extract + deck generation happen
 * inside ONE request.
 *
 * The backend always answers within its own budget (deck, 504 or partial deck), so
 * the client MUST wait longer than `budget + upload + extract`. The per-batch
 * heuristic is kept only to fail faster on small decks; it can never shrink the wait
 * below what the backend needs (that mismatch made the browser abort ~60s before the
 * backend could send its 504 on a hard/50 deck with a 9.5 MB PDF).
 */
export function directDeckUploadTimeoutMs(
  file: File,
  cardCount: number,
  difficulty: DeckGenerationOptions['difficulty']
): number {
  const aiBatches = estimateDeckAiBatches(cardCount, difficulty);
  const uploadSlackMs = Math.ceil(file.size / (512 * 1024)) * 5_000;
  const heuristicMs = 90_000 + aiBatches * 110_000 + uploadSlackMs;
  const mustWaitMs = backendBudgetMs + uploadSlackMs + PDF_EXTRACT_SLACK_MS;
  return Math.min(deckGenerationClientTimeoutMs, Math.max(heuristicMs, mustWaitMs));
}
