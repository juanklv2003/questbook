import { z } from 'zod';
import { AppError } from '../errors/AppError';

/**
 * Valida un request body (o cualquier valor) contra un schema de zod.
 * Si falla, lanza un AppError(400) con el primer issue legible, de modo que
 * el errorHandler global lo serialice como `{ error }` (nunca un 500).
 */
export function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const first = parsed.error.issues[0];
  const path = first?.path.join('.');
  const message = first?.message ?? 'Invalid request body';
  throw new AppError(400, path ? `${path}: ${message}` : message);
}