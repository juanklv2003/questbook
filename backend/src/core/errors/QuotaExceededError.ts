import { AppError } from './AppError';

/**
 * Thrown when every Gemini API key has exhausted its free quota (HTTP 429).
 * Carries the retry hint so the HTTP layer can serialize it for the client.
 */
export class QuotaExceededError extends AppError {
  readonly retryAfterSeconds: number;
  readonly resetAt: string;
  readonly provider = 'gemini' as const;

  constructor(retryAfterSeconds = 60, resetAt?: string, message?: string) {
    super(
      429,
      message ?? 'Has alcanzado el límite gratuito de la IA. Inténtalo de nuevo en unos segundos.'
    );
    this.retryAfterSeconds = retryAfterSeconds;
    this.resetAt =
      resetAt ?? new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
