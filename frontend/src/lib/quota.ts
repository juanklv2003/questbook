import type { ModelOverloadedInfo, QuotaExceededInfo } from '../types';

/** Raw 429 payload sent by the backend errorHandler. */
interface QuotaErrorPayload {
  code?: unknown;
  retryAfterSeconds?: unknown;
  resetAt?: unknown;
  error?: unknown;
}

/** Raw 503 payload sent by the backend errorHandler for model saturation. */
type OverloadErrorPayload = QuotaErrorPayload;

/** True when an axios failure is an app rate limit (429 + RATE_LIMITED), not Gemini quota. */
export function parseRateLimited(err: unknown): boolean {
  const response = (err as { response?: { status?: unknown; data?: unknown } })?.response;
  if (response?.status !== 429) return false;
  const data = response.data as { code?: unknown } | null | undefined;
  return data?.code === 'RATE_LIMITED';
}

/** True when an axios failure is a Gemini quota response (429 + code). */
export function isQuotaErrorResponse(err: unknown): boolean {
  const response = (err as { response?: { status?: unknown; data?: unknown } })?.response;
  if (response?.status !== 429) return false;
  const data = response.data as QuotaErrorPayload | null | undefined;
  return data?.code === 'QUOTA_EXCEEDED';
}

/**
 * Extract the quota retry info from an axios failure.
 * Returns null for any other error shape.
 */
export function parseQuotaExceeded(err: unknown): QuotaExceededInfo | null {
  if (!isQuotaErrorResponse(err)) return null;
  const data = (err as { response: { data: QuotaErrorPayload } }).response.data;
  const retryAfterSeconds =
    typeof data.retryAfterSeconds === 'number' && Number.isFinite(data.retryAfterSeconds)
      ? Math.max(1, Math.ceil(data.retryAfterSeconds))
      : 60;
  const resetAt =
    typeof data.resetAt === 'string' && !Number.isNaN(Date.parse(data.resetAt))
      ? data.resetAt
      : new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
  return { retryAfterSeconds, resetAt };
}

/** True when an axios failure is a Gemini saturation response (503 + code). */
export function isOverloadedResponse(err: unknown): boolean {
  const response = (err as { response?: { status?: unknown; data?: unknown } })?.response;
  if (response?.status !== 503) return false;
  const data = response.data as OverloadErrorPayload | null | undefined;
  return data?.code === 'MODEL_OVERLOADED';
}

/**
 * Extract the saturation retry info from an axios failure.
 * Returns null for any other error shape.
 */
export function parseOverloaded(err: unknown): ModelOverloadedInfo | null {
  if (!isOverloadedResponse(err)) return null;
  const data = (err as { response: { data: OverloadErrorPayload } }).response.data;
  const retryAfterSeconds =
    typeof data.retryAfterSeconds === 'number' && Number.isFinite(data.retryAfterSeconds)
      ? Math.max(1, Math.ceil(data.retryAfterSeconds))
      : 25;
  const resetAt =
    typeof data.resetAt === 'string' && !Number.isNaN(Date.parse(data.resetAt))
      ? data.resetAt
      : new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
  return { retryAfterSeconds, resetAt };
}

/** Seconds left until resetAt (0 when already elapsed or invalid). */
export function getRemainingSeconds(resetAt: string, now = Date.now()): number {
  const target = Date.parse(resetAt);
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/** Format seconds as mm:ss for the countdown label. */
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
