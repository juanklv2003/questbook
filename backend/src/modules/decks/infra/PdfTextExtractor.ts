import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';
import { PDFParse } from 'pdf-parse';
import { AppError } from '../../../core/errors/AppError';

const EXTRACT_TIMEOUT_MS = 60_000;

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  try {
    return typeof error === 'string' ? error : JSON.stringify(error);
  } catch {
    return 'unknown worker error';
  }
}

function workerScriptPath(): string | null {
  const compiledNextToThis = path.join(__dirname, '../../../workers/pdfExtractWorker.js');
  if (fs.existsSync(compiledNextToThis)) return compiledNextToThis;

  const distFromSrc = path.join(__dirname, '../../../../dist/workers/pdfExtractWorker.js');
  if (fs.existsSync(distFromSrc)) return distFromSrc;

  return null;
}

async function extractInProcess(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return (result?.text || '').trim();
  } finally {
    await parser.destroy();
  }
}

function runPdfWorker(workerFile: string, workerData: { buffer?: Buffer; filePath?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    console.info('[pdf-extract] starting worker', { workerFile, hasPath: Boolean(workerData.filePath) });
    const worker = new Worker(workerFile, { workerData });

    const timeout = setTimeout(() => {
      worker.terminate().catch(() => undefined);
      reject(
        new AppError(
          422,
          'La extracción del PDF tardó demasiado. Probá con un archivo más pequeño.'
        )
      );
    }, EXTRACT_TIMEOUT_MS);

    worker.once('message', (msg: { text?: string; error?: string }) => {
      clearTimeout(timeout);
      if (msg.error) {
        console.error('[pdf-extract] worker reported error:', msg.error);
        reject(
          new AppError(
            422,
            'El archivo no es un PDF válido o no se pudo leer su contenido.',
            true,
            'PDF_PARSE_FAILED',
            msg.error.replace(/\s+/g, ' ').slice(0, 160)
          )
        );
        return;
      }
      const text = (msg.text || '').trim();
      if (!text) {
        reject(
          new AppError(
            422,
            'No se pudo extraer texto del PDF. Asegúrate de que contenga texto real (no solo imágenes escaneadas).'
          )
        );
        return;
      }
      resolve(text);
    });

    worker.once('error', (error) => {
      clearTimeout(timeout);
      console.error('[pdf-extract] worker error event:', error);
      reject(new Error(errorMessage(error)));
    });

    worker.once('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
      }
    });
  });
}

async function loadPdfBytes(input: { buffer?: Buffer; filePath?: string }): Promise<Uint8Array> {
  if (input.filePath) {
    return new Uint8Array(await fs.promises.readFile(input.filePath));
  }
  if (input.buffer) {
    return new Uint8Array(input.buffer);
  }
  throw new Error('Invalid PDF buffer');
}

async function extractPdf(input: { buffer?: Buffer; filePath?: string }): Promise<string> {
  const workerFile = workerScriptPath();
  if (workerFile) {
    try {
      return await runPdfWorker(workerFile, input);
    } catch (error) {
      console.warn(
        '[pdf-extract] worker failed; extracting in process',
        errorMessage(error)
      );
    }
  }

  const bytes = await loadPdfBytes(input);
  let text: string;
  try {
    text = await extractInProcess(bytes);
  } catch (error) {
    console.error('[pdf-extract] in-process parse failed:', errorMessage(error));
    throw new AppError(
      422,
      'El archivo no es un PDF válido o no se pudo leer su contenido.',
      true,
      'PDF_PARSE_FAILED',
      errorMessage(error).replace(/\s+/g, ' ').slice(0, 160)
    );
  }

  if (!text) {
    throw new AppError(
      422,
      'No se pudo extraer texto del PDF. Asegúrate de que contenga texto real (no solo imágenes escaneadas).'
    );
  }
  return text;
}

/** Extrae texto leyendo el PDF desde disco (no duplica el archivo en el heap del proceso principal). */
export async function extractTextFromPdfPath(filePath: string): Promise<string> {
  return extractPdf({ filePath });
}

/**
 * Extrae el texto de un PDF en un worker thread (no bloquea el event loop).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return extractPdf({ buffer });
}
