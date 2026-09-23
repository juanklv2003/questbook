import { env } from './env';

/** Human-readable max upload size for API error messages. */
export function formatMaxPdfUploadSize(): string {
  const mb = env.MAX_PDF_UPLOAD_MB;
  return `${mb} MB`;
}

/**
 * Tamaño máximo del PDF que además se archiva en Cloudinary.
 *
 * Por encima de esto sólo se usa el texto: subir un PDF enorme no aporta nada
 * (Cloudinary free ≈10 MB y el plan free de Render se queda sin RAM al sostener
 * el buffer + la subida) y era el origen de los 502 por OOM. Se usa también para
 * NO leer a memoria el primer PDF cuando no se va a archivar.
 */
export function cloudinaryAttachmentMaxBytes(): number {
  return Math.min(env.CLOUDINARY_MAX_PDF_BYTES, 7 * 1024 * 1024);
}
