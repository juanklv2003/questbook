import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
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

/**
 * Clave del limiter: usuario autenticado, con respaldo por IP.
 *
 * express-rate-limit v8 valida el `keyGenerator` inspeccionando su código fuente:
 * si encuentra `req.ip` sin una llamada a `ipKeyGenerator` lanza
 * ERR_ERL_KEY_GEN_IPV6 **al construir el limiter** (y el backend no arranca).
 * `ipKeyGenerator` agrupa las IPv6 por subred (por defecto /56) para que un usuario
 * con un rango amplio no pueda evadir el límite rotando direcciones.
 */
function ipRateLimitKey(req: Request): string {
  return req.ip ? ipKeyGenerator(req.ip) : 'unknown';
}

function userOrIpKey(req: Request): string {
  const userId = req.user?.userId;
  if (userId) return userId;
  return ipRateLimitKey(req);
}

/** Brute-force protection on auth endpoints (per IP). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipRateLimitKey,
  handler: rateLimitJsonHandler,
  message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
});

/** Expensive AI deck generation (per authenticated user, fallback IP). */
export const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: rateLimitJsonHandler,
  message: 'Has generado demasiados libros en poco tiempo. Inténtalo más tarde.',
});

/** AI answer evaluation during study (per user). */
export const aiEvaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: rateLimitJsonHandler,
  message: 'Demasiadas evaluaciones en poco tiempo. Haz una pausa e inténtalo de nuevo.',
});
