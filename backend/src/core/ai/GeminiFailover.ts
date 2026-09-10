import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { QuotaExceededError } from '../errors/QuotaExceededError';

/** Fallback wait when Gemini does not report a retry delay. */
const FALLBACK_RETRY_AFTER_SECONDS = 60;

/**
 * Determina si un error de Gemini corresponde a que la clave agotó su cuota/uso
 * (HTTP 429 RESOURCE_EXHAUSTED) o límite de tasa. Solo en estos casos tiene
 * sentido saltar a la siguiente clave.
 */
export function isQuotaExhausted(error: any): boolean {
  if (!error) return false;
  const status = error?.status ?? error?.statusCode ?? error?.response?.status;
  if (status === 429) return true;
  const message = String(error?.message || '') + ' ' + String(error?.details || '');
  const lowered = message.toLowerCase();
  return (
    lowered.includes('resource_exhausted') ||
    lowered.includes('quota') ||
    lowered.includes('rate limit') ||
    lowered.includes('429')
  );
}

/**
 * Extract the retry delay (seconds) from a Gemini quota error.
 * Lookup order: RetryInfo.retryDelay in errorDetails/details, then "retry in Ns"
 * patterns in the message, then the 60s fallback. Never logs API keys.
 */
export function parseRetryDelay(error: any): number {
  const detailArrays: unknown[] = [
    error?.errorDetails,
    error?.details,
    error?.error?.details,
    error?.error?.errorDetails,
    (error as { cause?: unknown })?.cause,
  ];

  const retryDelayFromDetails = (details: unknown): number | null => {
    if (!Array.isArray(details)) return null;
    for (const entry of details) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const type = String(record['@type'] ?? record['type'] ?? '');
      if (!type.toLowerCase().includes('retryinfo')) continue;
      const raw = String(record['retryDelay'] ?? '');
      const parsed = parseDurationSeconds(raw);
      if (parsed !== null) return parsed;
    }
    return null;
  };

  for (const candidate of detailArrays) {
    // `cause` may wrap the SDK error one level deep.
    const nested =
      candidate && typeof candidate === 'object' && !Array.isArray(candidate)
        ? [
            (candidate as Record<string, unknown>)['errorDetails'],
            (candidate as Record<string, unknown>)['details'],
          ]
        : [candidate];
    for (const arr of nested) {
      const found = retryDelayFromDetails(arr);
      if (found !== null) return found;
    }
  }

  const haystack = [
    error?.message,
    error?.details,
    error?.statusText,
    safeJson(error?.errorDetails),
    safeJson(error?.details),
  ]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');

  const patterns = [
    /retry\s+in\s+(\d+(?:\.\d+)?)\s*s/i,
    /try\s+again\s+in\s+(\d+(?:\.\d+)?)\s*s/i,
    /retrydelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)s/i,
  ];
  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match) {
      const seconds = Math.ceil(Number(match[1]));
      if (Number.isFinite(seconds) && seconds > 0) return seconds;
    }
  }

  return FALLBACK_RETRY_AFTER_SECONDS;
}

/** Parse a "Ns" duration (e.g. "32s", "32.5s") into ceiled seconds. */
function parseDurationSeconds(raw: string): number | null {
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)s$/i);
  if (!match) return null;
  const seconds = Math.ceil(Number(match[1]));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** JSON helper that never throws (used only for message scanning). */
function safeJson(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value ?? '');
  } catch {
    return '';
  }
}

/**
 * Key manager with automatic failover.
 *
 * When the current key hits a quota error (429 / RESOURCE_EXHAUSTED), it
 * rotates to the next key. Non-quota errors propagate without rotating.
 */
export class GeminiFailover {
  private readonly keys: string[];
  private currentIndex = 0;

  constructor(keys: string[] = env.GEMINI_API_KEYS) {
    if (!keys || keys.length === 0) {
      throw new Error('Se necesita al menos una API key de Gemini.');
    }
    this.keys = keys;
  }

  /**
   * Run `fn` with the current key; on quota errors retry with the next keys.
   * When every key is exhausted, throw QuotaExceededError with the longest
   * observed retry delay (fallback 60s). Never exposes key values.
   */
  async withFailover<T>(fn: (client: GoogleGenerativeAI) => Promise<T>): Promise<T> {
    const attempts = this.keys.length;
    let maxRetryAfter = 0;

    for (let i = 0; i < attempts; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      try {
        const client = new GoogleGenerativeAI(this.keys[idx]);
        const result = await fn(client);
        // Remember the working key for the next call.
        this.currentIndex = idx;
        return result;
      } catch (error: any) {
        if (error instanceof QuotaExceededError) throw error;
        if (isQuotaExhausted(error)) {
          maxRetryAfter = Math.max(maxRetryAfter, parseRetryDelay(error));
          console.warn(
            `[Gemini] Key ${idx + 1} of ${this.keys.length} exhausted ` +
            `(${error?.message || error?.status || 'quota'}). Trying next...`
          );
          continue;
        }
        throw error;
      }
    }

    // All keys exhausted: report 429 with retry hint instead of a generic 500.
    const retryAfterSeconds =
      maxRetryAfter > 0 ? maxRetryAfter : FALLBACK_RETRY_AFTER_SECONDS;
    throw new QuotaExceededError(
      retryAfterSeconds,
      new Date(Date.now() + retryAfterSeconds * 1000).toISOString()
    );
  }
}