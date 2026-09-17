import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Nota: el store por defecto es en memoria. Con una sola instancia (plan free de
// Render) alcanza; los contadores se reinician al reiniciar el servicio y no se
// comparten entre instancias. Si algún día se escala horizontalmente, migrar a
// un store compartido (por ejemplo @rate-limit/redis).

const rateLimitJsonHandler = (
  _req: Request,
  res: import('express').Response,
  _next: import('express').NextFunction,
  options: { message: string }
) => {
  res.status(429).json({
    error: options.message,
    code: 'RATE_LIMITED',
  });
};

/** Brute-force protection on auth endpoints (per IP). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler,
  message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
});

/** Expensive AI deck generation (per authenticated user, fallback IP). */
export const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
  handler: rateLimitJsonHandler,
  message: 'Has generado demasiados libros en poco tiempo. Inténtalo más tarde.',
});

/** AI answer evaluation during study (per user). */
export const aiEvaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
  handler: rateLimitJsonHandler,
  message: 'Demasiadas evaluaciones en poco tiempo. Haz una pausa e inténtalo de nuevo.',
});
