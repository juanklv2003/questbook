import { AppError } from '../../../core/errors/AppError';

/** True when the buffer contains a PDF header (spec allows junk before `%PDF-`). */
export function bufferIncludesPdfHeader(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 1024).toString('latin1');
  return head.includes('%PDF-');
}

export function assertLooksLikePdf(buffer: Buffer): void {
  if (!bufferIncludesPdfHeader(buffer)) {
    throw new AppError(422, 'El archivo no es un PDF válido. Subí un archivo PDF.');
  }
}
