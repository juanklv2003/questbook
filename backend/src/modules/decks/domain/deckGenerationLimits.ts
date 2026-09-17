import { env } from '../../../config/env';

/** Max source characters sent to deck-generation prompts (Gemini; Groq ITPM cannot handle more). */
export const DECK_PRACTICAL_TEXT_CAP = 32_000;

export function capDeckSourceText(text: string): string {
  const cap = Math.min(env.PDF_MAX_TEXT_CHARS, DECK_PRACTICAL_TEXT_CAP);
  if (text.length <= cap) return text;
  return text.slice(0, cap);
}
