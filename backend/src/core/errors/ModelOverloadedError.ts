import { AppError } from './AppError';

/**
 * Thrown when the Gemini model itself is saturated (HTTP 503 overloaded /
 * high demand), not a per-key quota issue. Carries the retry hint so the
 * HTTP layer can serialize it for the client without raw dumps.
 */
export class ModelOverloadedError extends AppError {
  readonly retryAfterSeconds: number;
  readonly resetAt: string;
  readonly provider = 'gemini' as const;

  constructor(retryAfterSeconds = 25, resetAt?: string, message?: string) {
    super(
      503,
      message ?? 'El modelo de IA está saturado. Inténtalo de nuevo en unos segundos.'
    );
    this.retryAfterSeconds = retryAfterSeconds;
    this.resetAt =
      resetAt ?? new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
