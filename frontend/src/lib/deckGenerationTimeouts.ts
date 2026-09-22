import type { DeckGenerationOptions } from '../types';

const DEFAULT_DECK_TOTAL_TIMEOUT_MS = 480_000;
const DEFAULT_DECK_CLIENT_TIMEOUT_MS = DEFAULT_DECK_TOTAL_TIMEOUT_MS + 60_000;

let deckGenerationClientTimeoutMs = DEFAULT_DECK_CLIENT_TIMEOUT_MS;

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

/** Axios timeout for direct Render upload + full deck generation. */
export function directDeckUploadTimeoutMs(
  file: File,
  cardCount: number,
  difficulty: DeckGenerationOptions['difficulty']
): number {
  const aiBatches = estimateDeckAiBatches(cardCount, difficulty);
  const uploadSlackMs = Math.ceil(file.size / (512 * 1024)) * 5_000;
  const heuristicMs = 90_000 + aiBatches * 110_000 + uploadSlackMs;
  return Math.min(deckGenerationClientTimeoutMs, heuristicMs);
}
