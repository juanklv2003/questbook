import { env } from '../../../config/env';

/**
 * Max source characters sent to deck-generation prompts (Gemini; Groq ITPM cannot handle more).
 */
export const DECK_PRACTICAL_TEXT_CAP = 32_000;

export type DeckDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Extra wait room on the browser beyond `AI_DECK_TOTAL_TIMEOUT_MS`.
 * Covers upload + PDF extract (~45s) plus a slow last Gemini call before the
 * backend 504 reaches the client. 60s left ~15s of margin on a large PDF.
 */
export const DECK_GENERATION_CLIENT_TIMEOUT_SLACK_MS = 120_000;

/**
 * Room kept for the batches that still have to run, so the batch in progress cannot
 * eat the whole budget (one batch may need several calls: retry, split or JSON→text
 * fallback). Equals one overloaded-retry wait.
 */
export const DECK_GENERATION_BATCH_RESERVE_MS = 45_000;

/**
 * Empty-batch and MAX_TOKENS recovery may split a batch in half once.
 * Nested splits (halves of halves) burn the 480s budget on a bad batch.
 */
export const DECK_GENERATION_MAX_SPLIT_DEPTH = 1;

export function capDeckSourceText(text: string): string {
  const cap = Math.min(env.PDF_MAX_TEXT_CHARS, DECK_PRACTICAL_TEXT_CAP);
  if (text.length <= cap) return text;
  return text.slice(0, cap);
}

export function deckBatchLimitFor(totalCards: number, difficulty?: DeckDifficulty): number {
  if (totalCards <= 15) return totalCards;
  if (difficulty === 'hard') {
    return totalCards > 30 ? 20 : 15;
  }
  if (totalCards > 30) return 20;
  return 20;
}

export function deckGenerationClientTimeoutMs(): number {
  return env.AI_DECK_TOTAL_TIMEOUT_MS + DECK_GENERATION_CLIENT_TIMEOUT_SLACK_MS;
}
