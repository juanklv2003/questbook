import { env } from '../../../config/env';

/**
 * Max source characters sent to deck-generation prompts (Gemini; Groq ITPM cannot handle more).
 */
export const DECK_PRACTICAL_TEXT_CAP = 32_000;

export type DeckDifficulty = 'easy' | 'medium' | 'hard';

/** Extra wait room on the browser beyond `AI_DECK_TOTAL_TIMEOUT_MS` (upload + slack). */
export const DECK_GENERATION_CLIENT_TIMEOUT_SLACK_MS = 60_000;

/** One ModelOverloaded retry wait (matches generator cap). */
export const DECK_GENERATION_OVERLOAD_WAIT_MS = 45_000;

/**
 * Room kept for the batches that still have to run, so the batch in progress cannot
 * eat the whole budget (one batch may need several calls: retry, split or JSON→text
 * fallback). Equals one overloaded-retry wait.
 */
export const DECK_GENERATION_BATCH_RESERVE_MS = 45_000;

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

export function estimateDeckAiBatchCount(totalCards: number, difficulty?: DeckDifficulty): number {
  const limit = deckBatchLimitFor(totalCards, difficulty);
  return Math.max(1, Math.ceil(totalCards / limit));
}

/**
 * Worst-case sequential Gemini calls for one top-level batch (2 attempts, JSON→text,
 * MAX_TOKENS or empty-batch split).
 */
export function worstCaseLlmCallsPerBatch(cardsInBatch: number): number {
  let calls = 4;
  if (cardsInBatch > 1) {
    calls += 4;
  }
  if (cardsInBatch > 6) {
    calls += 2;
  }
  return calls;
}

/**
 * Upper bound for deck generation wall time BEFORE the `AI_DECK_TOTAL_TIMEOUT_MS` cap.
 *
 * Diagnóstico/label, no un límite operativo: hoy da 1,2M-3,7M ms (10 llamadas por
 * tanda), así que el `Math.min` con el cap siempre gana. NO usarlo para acortar los
 * timeouts por llamada: una tanda de 20 tarjetas tarda 35-60 s reales (medido).
 */
export function estimateDeckGenerationBudgetMs(totalCards: number, difficulty?: DeckDifficulty): number {
  const batchLimit = deckBatchLimitFor(totalCards, difficulty);
  const batches = estimateDeckAiBatchCount(totalCards, difficulty);
  const perBatchWorst =
    worstCaseLlmCallsPerBatch(batchLimit) * env.AI_DECK_TIMEOUT_MS + DECK_GENERATION_OVERLOAD_WAIT_MS;
  return batches * perBatchWorst;
}

export function deckGenerationClientTimeoutMs(): number {
  return env.AI_DECK_TOTAL_TIMEOUT_MS + DECK_GENERATION_CLIENT_TIMEOUT_SLACK_MS;
}
