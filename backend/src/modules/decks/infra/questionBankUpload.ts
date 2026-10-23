import fs from 'fs/promises';
import type { Express } from 'express';
import { AppError } from '../../../core/errors/AppError';
import { cloudinaryAttachmentMaxBytes } from '../../../config/uploadLimits';
import { sanitizePdfDisplayName } from '../domain/deckPdfSourceNames';
import { parseQuestionBankLines, type QuestionBankItem } from '../domain/questionBank';
import { assertLooksLikePdf } from './pdfHeader';
import { deleteUploadedPdfFile, readUploadedPdfBuffer } from './pdfUploadStorage';
import {
  extractQuestionBankLinesFromBuffer,
  extractQuestionBankLinesFromPath,
} from './PdfTextExtractor';

type UploadedFile = Express.Multer.File;

export interface QuestionBankDocument {
  items: QuestionBankItem[];
  /** Caracteres reales leídos del PDF (para la barra de presupuesto de la UI). */
  totalCharacters: number;
  sourceFileNames: string[];
  /** Primer PDF chico, para archivarlo en Cloudinary junto al mazo. */
  firstPdfBuffer?: Buffer;
  firstPdfName?: string;
}

function noItemsError(): AppError {
  return new AppError(
    422,
    'No se encontraron consignas numeradas en el PDF. El modo banco de preguntas necesita un archivo con preguntas del tipo "1.", "2.", "3.".'
  );
}

function reportUnmarked(item: QuestionBankItem, fileName: string): void {
  if (!item.unmarkedMultipleChoice) return;
  console.warn('[deck-gen] question bank: multiple choice sin marca legible', {
    file: fileName,
    number: item.number,
    question: item.question.slice(0, 120),
  });
}

async function readOne(
  file: UploadedFile
): Promise<{ items: QuestionBankItem[]; totalCharacters: number; name: string }> {
  const name = sanitizePdfDisplayName(file.originalname);

  if (file.path) {
    const head = Buffer.alloc(1024);
    const handle = await fs.open(file.path, 'r');
    try {
      const { bytesRead } = await handle.read(head, 0, 1024, 0);
      assertLooksLikePdf(head.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
    const extracted = await extractQuestionBankLinesFromPath(file.path);
    return {
      items: parseQuestionBankLines(extracted.lines),
      totalCharacters: extracted.totalCharacters,
      name,
    };
  }

  const buffer = await readUploadedPdfBuffer(file);
  assertLooksLikePdf(buffer);
  const extracted = await extractQuestionBankLinesFromBuffer(Buffer.from(buffer));
  return {
    items: parseQuestionBankLines(extracted.lines),
    totalCharacters: extracted.totalCharacters,
    name,
  };
}

/**
 * Lee uno o más PDFs de examen y devuelve una consigna por pregunta numerada.
 *
 * Los archivos se concatenan en el orden recibido: el banco de preguntas no
 * depende del texto completo, así que sumar varios exámenes no mezcla nada (cada
 * bloque se parsea por separado dentro de su propio PDF).
 */
export async function readQuestionBankFromUploads(
  files: UploadedFile[]
): Promise<QuestionBankDocument> {
  const items: QuestionBankItem[] = [];
  const sourceFileNames: string[] = [];
  let totalCharacters = 0;
  let firstPdfBuffer: Buffer | undefined;
  let firstPdfName: string | undefined;

  for (const file of files) {
    try {
      const parsed = await readOne(file);
      totalCharacters += parsed.totalCharacters;
      if (parsed.items.length > 0) {
        sourceFileNames.push(parsed.name);
        for (const item of parsed.items) {
          reportUnmarked(item, parsed.name);
          items.push(item);
        }
      }

      const declaredSize = typeof file.size === 'number' && file.size > 0 ? file.size : undefined;
      if (
        !firstPdfBuffer &&
        (declaredSize === undefined || declaredSize <= cloudinaryAttachmentMaxBytes())
      ) {
        try {
          firstPdfBuffer = await readUploadedPdfBuffer(file);
          firstPdfName = file.originalname;
        } catch {
          // Sin adjunto en Cloudinary para este archivo.
        }
      }
    } finally {
      await deleteUploadedPdfFile(file);
    }
  }

  if (items.length === 0) {
    throw noItemsError();
  }

  return { items, totalCharacters, sourceFileNames, firstPdfBuffer, firstPdfName };
}

/** Igual que `readQuestionBankFromUploads` pero sobre un PDF ya descargado (Cloudinary). */
export async function readQuestionBankFromBuffer(
  buffer: Buffer,
  fileName?: string
): Promise<QuestionBankDocument> {
  assertLooksLikePdf(buffer);
  const extracted = await extractQuestionBankLinesFromBuffer(Buffer.from(buffer));
  const items = parseQuestionBankLines(extracted.lines);
  if (items.length === 0) {
    throw noItemsError();
  }
  const name = sanitizePdfDisplayName(fileName ?? 'examen.pdf');
  for (const item of items) {
    reportUnmarked(item, name);
  }
  return {
    items,
    totalCharacters: extracted.totalCharacters,
    sourceFileNames: [name],
  };
}
