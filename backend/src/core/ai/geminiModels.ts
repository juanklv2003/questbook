import { env } from '../../config/env';

/**
 * Fallbacks verificados contra la API real con la clave del proyecto
 * (GET /v1beta/models, 2026-09-18): estos id existen y reportan
 * outputTokenLimit = 65 536 / inputTokenLimit = 1 048 576.
 *
 * `gemini-2.0-flash` y `gemini-1.5-flash` se eliminaron a propósito: ya están
 * shut down (no aparecen en el listado), así que tenerlos acá solo gastaba dos
 * llamadas 404 antes de llegar a un modelo vivo.
 */
const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
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
