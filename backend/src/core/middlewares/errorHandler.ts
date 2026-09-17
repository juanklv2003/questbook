import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { QuotaExceededError } from '../errors/QuotaExceededError';
import { ModelOverloadedError } from '../errors/ModelOverloadedError';
import { formatMaxPdfUploadSize } from '../../config/uploadLimits';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Gemini free-tier quota: serialize retry hints, never raw dumps or keys.
  if (err instanceof QuotaExceededError) {
    return res.status(429).json({
      error: err.message,
      code: 'QUOTA_EXCEEDED',
      retryAfterSeconds: err.retryAfterSeconds,
      resetAt: err.resetAt,
    });
  }

  // Gemini model saturation (503): clear message + countdown hints, no raw dumps.
  if (err instanceof ModelOverloadedError) {
    return res.status(503).json({
      error: err.message,
      code: 'MODEL_OVERLOADED',
      provider: err.provider,
      retryAfterSeconds: err.retryAfterSeconds,
      resetAt: err.resetAt,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Malformed JSON syntax: express.json() throws before controllers run, so
  // parseBody never sees it. Map to the 400 { error } contract (invalid JSON
  // bodies MUST yield 400 per the request-validation spec) instead of the
  // 500 fallback below.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  // Errores de multer (subida de archivos): el habitual es archivo demasiado grande.
  // MulterError no extiende AppError, así que lo mapeamos a HTTP con mensaje claro.
  if (err && (err as { name?: string }).name === 'MulterError') {
    const code = (err as { code?: string }).code;
    const status = code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message =
      code === 'LIMIT_FILE_SIZE'
        ? `El archivo supera el tamaño máximo permitido (${formatMaxPdfUploadSize()}).`
        : 'No se pudo procesar el archivo subido.';
    return res.status(status).json({ error: message });
  }

  console.error('UNEXPECTED ERROR:', err);
  // En desarrollo mostramos el mensaje real para poder depurar rápido.
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  return res.status(500).json({ error: message });
};
