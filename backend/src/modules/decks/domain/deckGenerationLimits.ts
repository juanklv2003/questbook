import { env } from '../../../config/env';

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

/** Same cap as `PDF_MAX_TEXT_CHARS` (default 800_000, tope 1_000_000). Exposed for upload UI + multi-PDF merge. */
export function deckSourceTextCap(): number {
  return env.PDF_MAX_TEXT_CHARS;
}

export function capDeckSourceText(text: string): string {
  const cap = deckSourceTextCap();
  if (text.length <= cap) return text;
  return text.slice(0, cap);
}

/** Caracteres de texto que entran en UNA llamada a la IA (default 200_000). */
export function deckPromptTextCharsPerCall(): number {
  return env.AI_DECK_PROMPT_CHARS_PER_CALL;
}

export interface DeckPromptWindow {
  /** Fragmento que ve esta llamada. `slice` de V8 no copia: sólo apunta al string original. */
  text: string;
  /** Posición 1-based de la ventana dentro del documento (1 de 1 cuando entra completa). */
  index: number;
  /** Cantidad total de ventanas en que se reparte el documento. */
  total: number;
}

/**
 * Ventana de texto que se envía a la tanda `batchIndex` (1-based).
 *
 * Antes cada tanda recibía el mismo texto (los primeros `deckSourceTextCap()`
 * caracteres), así que un documento grande pagaba el prompt completo en CADA
 * llamada: latencia y tokens O(tandas), todo el contenido repetido y riesgo de
 * 429 por TPM. Con ventanas, la tanda `i` lee una porción distinta y consecutiva,
 * con lo que cada llamada queda acotada por `AI_DECK_PROMPT_CHARS_PER_CALL`.
 *
 * Si el texto entra en una sola llamada se devuelve completo: para documentos
 * chicos/medianos el comportamiento es idéntico al de antes.
 *
 * El texto recibido YA debe venir acotado por `capDeckSourceText`.
 */
export function deckPromptWindow(text: string, batchIndex: number): DeckPromptWindow {
  const budget = deckPromptTextCharsPerCall();
  if (text.length <= budget) {
    return { text, index: 1, total: 1 };
  }

  const total = Math.ceil(text.length / budget);
  const safeIndex = Number.isFinite(batchIndex) ? Math.floor(batchIndex) : 1;
  const index = ((Math.max(1, safeIndex) - 1) % total) + 1;
  const start = (index - 1) * budget;
  return { text: text.slice(start, start + budget), index, total };
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
