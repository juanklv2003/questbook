import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../../config/env';
import { AppError } from '../../../core/errors/AppError';
import { formatMaxPdfUploadSize } from '../../../config/uploadLimits';
import { bufferIncludesPdfHeader } from './pdfHeader';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/** Only accept PDFs the user just uploaded to our Cloudinary account. */
export function assertTrustedCloudinaryPdfUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError(400, 'URL del PDF inválida.');
  }
  if (parsed.protocol !== 'https:') {
    throw new AppError(400, 'URL del PDF inválida.');
  }
  const hostOk =
    parsed.hostname === 'res.cloudinary.com' || parsed.hostname.endsWith('.cloudinary.com');
  if (!hostOk) {
    throw new AppError(400, 'URL del PDF inválida.');
  }
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  if (pathParts[0] !== env.CLOUDINARY_CLOUD_NAME) {
    throw new AppError(400, 'URL del PDF inválida.');
  }
}

async function fetchPdfBufferFromUrl(url: string): Promise<Buffer> {
  assertTrustedCloudinaryPdfUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new AppError(422, 'No se pudo leer el PDF subido. Probá subirlo de nuevo.');
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const bytes = Number(contentLength);
      if (Number.isFinite(bytes) && bytes > env.MAX_PDF_UPLOAD_BYTES) {
        throw new AppError(
          413,
          `El archivo supera el tamaño máximo permitido (${formatMaxPdfUploadSize()}).`
        );
      }
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > env.MAX_PDF_UPLOAD_BYTES) {
      throw new AppError(
        413,
        `El archivo supera el tamaño máximo permitido (${formatMaxPdfUploadSize()}).`
      );
    }
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(422, 'La descarga del PDF tardó demasiado. Probá con un archivo más pequeño.');
    }
    throw new AppError(422, 'No se pudo leer el PDF subido. Probá de nuevo.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Download the original PDF bytes after a browser upload to Cloudinary.
 * Tries signed raw URL first (correct for PDFs), then legacy image delivery, then the client URL.
 */
export async function fetchPdfBufferForDeck(publicId: string, fallbackUrl: string): Promise<Buffer> {
  const candidates: string[] = [];

  for (const resourceType of ['raw', 'image'] as const) {
    candidates.push(
      cloudinary.url(publicId, {
        resource_type: resourceType,
        type: 'upload',
        secure: true,
        sign_url: true,
      })
    );
  }

  if (fallbackUrl.trim()) {
    candidates.push(fallbackUrl.trim());
  }

  for (const url of candidates) {
    try {
      const buffer = await fetchPdfBufferFromUrl(url);
      if (bufferIncludesPdfHeader(buffer)) {
        return buffer;
      }
    } catch {
      // try next delivery URL
    }
  }

  throw new AppError(422, 'El archivo no es un PDF válido. Subí un archivo PDF.');
}
