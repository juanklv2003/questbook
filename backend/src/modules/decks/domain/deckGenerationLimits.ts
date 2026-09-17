import { env } from '../../../config/env';

/** Max source characters sent to deck-generation prompts (speed + memory). */
export const DECK_PRACTICAL_TEXT_CAP = 50_000;

export function capDeckSourceText(text: string): string {
  const cap = Math.min(env.PDF_MAX_TEXT_CHARS, DECK_PRACTICAL_TEXT_CAP);
  if (text.length <= cap) return text;
  return text.slice(0, cap);
}
