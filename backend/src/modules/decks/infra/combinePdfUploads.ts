import fs from 'fs/promises';
import type { Express } from 'express';
import { capDeckSourceText, deckSourceTextCap } from '../domain/deckGenerationLimits';
import { cloudinaryAttachmentMaxBytes } from '../../../config/uploadLimits';
import {
  deleteUploadedPdfFile,
  readUploadedPdfBuffer,
} from './pdfUploadStorage';
import { assertLooksLikePdf } from './pdfHeader';
import {
  extractPdfTextFromBuffer,
  extractPdfTextFromPath,
  type ExtractedPdfText,
} from './PdfTextExtractor';

type UploadedFile = Express.Multer.File;

/** Separador entre PDFs; se descuenta del presupuesto al acumular. */
const PART_SEPARATOR = '\n\n';

export interface CombinedPdfText {
  content: string;
  /** Caracteres reales leídos de los PDFs procesados (antes del tope). */
  totalCharacters: number;
  /** PDFs que quedaron fuera del tope: su texto no se usa, así que no se parsean. */
  skippedFiles: number;
  firstPdfBuffer?: Buffer;
  firstPdfName?: string;
}

async function extractOne(file: UploadedFile, maxChars: number): Promise<ExtractedPdfText> {
  if (file.path) {
    const head = Buffer.alloc(1024);
    const handle = await fs.open(file.path, 'r');
    try {
      const { bytesRead } = await handle.read(head, 0, 1024, 0);
      assertLooksLikePdf(head.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
    return extractPdfTextFromPath(file.path, maxChars);
  }
  const buffer = await readUploadedPdfBuffer(file);
  assertLooksLikePdf(buffer);
  // pdf-parse se queda con la propiedad del TypedArray y `file.buffer` se reutiliza
  // después para subirlo a Cloudinary: sólo en modo memoria (sin archivo en disco)
  // hay que pasarle una copia. Con `diskStorage` (producción) siempre hay `path` y
  // la lectura es del archivo, sin copias.
  return extractPdfTextFromBuffer(Buffer.from(buffer), maxChars);
}

/**
 * Extracts text from one or more uploaded PDFs and joins them for deck generation.
 *
 * Acumula con presupuesto: en cuanto el texto alcanza `PDF_MAX_TEXT_CHARS` deja de
 * parsear los PDFs siguientes (antes se extraía todo, se unía en un string de
 * varios MB y se tiraba el sobrante con un `slice`).
 */
export async function combinePdfUploads(files: UploadedFile[]): Promise<CombinedPdfText> {
  const cap = deckSourceTextCap();
  const parts: string[] = [];
  let used = 0;
  let totalCharacters = 0;
  let skippedFiles = 0;
  let firstPdfBuffer: Buffer | undefined;
  let firstPdfName: string | undefined;

  for (const file of files) {
    try {
      const separatorChars = parts.length > 0 ? PART_SEPARATOR.length : 0;
      const remaining = cap - used - separatorChars;
      if (remaining <= 0) {
        skippedFiles += 1;
        continue;
      }

      const extracted = await extractOne(file, remaining);
      totalCharacters += extracted.totalCharacters;
      if (!extracted.text) continue;

      parts.push(extracted.text);
      used += extracted.text.length + separatorChars;

      // Sólo el primer PDF chico se archiva en Cloudinary (y recién después de
      // parsearlo, porque pdf-parse se queda con la propiedad del buffer). No se
      // lee a memoria un PDF que no se va a archivar.
      const declaredSize = typeof file.size === 'number' && file.size > 0 ? file.size : undefined;
      if (
        !firstPdfBuffer &&
        (declaredSize === undefined || declaredSize <= cloudinaryAttachmentMaxBytes())
      ) {
        try {
          firstPdfBuffer = await readUploadedPdfBuffer(file);
          firstPdfName = file.originalname;
        } catch {
          // Skip Cloudinary attach for this file.
        }
      }
    } finally {
      await deleteUploadedPdfFile(file);
    }
  }

  const joined = parts.join(PART_SEPARATOR);
  return {
    content: capDeckSourceText(joined),
    totalCharacters,
    skippedFiles,
    firstPdfBuffer,
    firstPdfName,
  };
}

/** Caracteres reales de un PDF (borra el temporal). El parseo se acota al tope del mazo. */
export async function measurePdfCharacters(file: UploadedFile): Promise<number> {
  try {
    const extracted = await extractOne(file, deckSourceTextCap());
    return extracted.totalCharacters;
  } finally {
    await deleteUploadedPdfFile(file);
  }
}
