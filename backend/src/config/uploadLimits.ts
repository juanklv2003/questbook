import { env } from './env';

/** Human-readable max upload size for API error messages. */
export function formatMaxPdfUploadSize(): string {
  const mb = env.MAX_PDF_UPLOAD_MB;
  return `${mb} MB`;
}
