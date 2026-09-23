import fs from 'fs/promises';
import type { Express } from 'express';
import { capDeckSourceText } from '../domain/deckGenerationLimits';
import {
  deleteUploadedPdfFile,
  readUploadedPdfBuffer,
} from './pdfUploadStorage';
import { assertLooksLikePdf } from './pdfHeader';
import { extractTextFromPdf, extractTextFromPdfPath } from './PdfTextExtractor';

type UploadedFile = Express.Multer.File;

export interface CombinedPdfText {
  content: string;
  totalCharacters: number;
  firstPdfBuffer?: Buffer;
  firstPdfName?: string;
}

export async function extractOne(file: UploadedFile): Promise<string> {
  if (file.path) {
    const head = Buffer.alloc(1024);
    const handle = await fs.open(file.path, 'r');
    try {
      const { bytesRead } = await handle.read(head, 0, 1024, 0);
      assertLooksLikePdf(head.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
    return extractTextFromPdfPath(file.path);
  }
  const buffer = await readUploadedPdfBuffer(file);
  assertLooksLikePdf(buffer);
  return extractTextFromPdf(buffer);
}

/**
 * Extracts text from one or more uploaded PDFs and joins them for deck generation.
 */
export async function combinePdfUploads(files: UploadedFile[]): Promise<CombinedPdfText> {
  const parts: string[] = [];
  let firstPdfBuffer: Buffer | undefined;
  let firstPdfName: string | undefined;

  for (const file of files) {
    try {
      const text = (await extractOne(file)).trim();
      if (text) parts.push(text);
      if (!firstPdfBuffer) {
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

  const joined = parts.join('\n\n');
  return {
    content: capDeckSourceText(joined),
    totalCharacters: joined.length,
    firstPdfBuffer,
    firstPdfName,
  };
}

/** Character count for one PDF (deletes the temp upload). */
export async function measurePdfCharacters(file: UploadedFile): Promise<number> {
  try {
    const text = (await extractOne(file)).trim();
    return text.length;
  } finally {
    await deleteUploadedPdfFile(file);
  }
}
