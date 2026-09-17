import { env } from '../../config/env';

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest',
] as const;

/** Ordered list: env override first, then stable fallbacks for keys without 2.5 access. */
export function geminiModelCandidates(): string[] {
  const configured = env.GEMINI_MODEL?.trim();
  const list = configured ? [configured, ...DEFAULT_GEMINI_MODELS] : [...DEFAULT_GEMINI_MODELS];
  return [...new Set(list)];
}

export function isGeminiModelNotFoundError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('not_found') ||
    msg.includes('not found') ||
    msg.includes('model_or_resource')
  );
}
