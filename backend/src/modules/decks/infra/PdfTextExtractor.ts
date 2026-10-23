import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';
import { PDFParse } from 'pdf-parse';
import { AppError } from '../../../core/errors/AppError';
import { deckSourceTextCap } from '../domain/deckGenerationLimits';
import type { QuestionBankLine } from '../domain/questionBank';

const EXTRACT_TIMEOUT_MS = 60_000;

/**
 * Renderizar y escanear pixels es mucho más caro que leer la capa de texto: un
 * examen de 8 páginas a escala 2 tarda decenas de segundos. El tope de texto
 * (60s) no alcanza para el modo banco de preguntas.
 */
const QUESTION_BANK_EXTRACT_TIMEOUT_MS = 240_000;

export interface ExtractedPdfText {
  /** Texto listo para el prompt, ya acotado a `maxChars` (lo que sobra no se usa nunca). */
  text: string;
  /** Caracteres reales del PDF, antes del tope. Alimenta la barra de presupuesto de la UI. */
  totalCharacters: number;
}

export interface ExtractedQuestionBank {
  lines: QuestionBankLine[];
  totalCharacters: number;
}

/**
 * Recorta el texto ANTES de sacarlo del worker / del parser.
 *
 * Un PDF de 300 páginas puede rendir 2-3M de caracteres; sin esto, ese string
 * (10-20 MB) se copiaría entero por el canal de mensajes del worker y viviría en
 * el heap del proceso principal sólo para tirarlo con un `slice` después.
 * Acotar primero deja el IPC y la memoria en el tamaño útil real.
 */
function clipExtractedText(raw: string | undefined, maxChars: number): ExtractedPdfText {
  const full = (raw ?? '').trim();
  if (full.length <= maxChars) {
    return { text: full, totalCharacters: full.length };
  }
  return { text: full.slice(0, maxChars), totalCharacters: full.length };
}

function emptyTextError(): AppError {
  return new AppError(
    422,
    'No se pudo extraer texto del PDF. Asegúrate de que contenga texto real (no solo imágenes escaneadas).'
  );
}

function questionBankError(detail?: string): AppError {
  return new AppError(
    422,
    'No se pudo analizar el PDF en modo banco de preguntas. Verificá que el archivo no esté dañado e intentá de nuevo.',
    true,
    'PDF_QUESTION_BANK_FAILED',
    detail
  );
}

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

async function extractInProcess(bytes: Uint8Array, maxChars: number): Promise<ExtractedPdfText> {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return clipExtractedText(result?.text, maxChars);
  } finally {
    await parser.destroy();
  }
}

/**
 * Modo banco de preguntas en proceso.
 *
 * Sólo se usa cuando no hay worker compilado (desarrollo con `ts-node` sin
 * `dist/`). Bloquea el event loop, así que en producción nunca se llega acá: el
 * worker compilado siempre existe después de `npm run build`.
 */
async function extractQuestionBankInProcess(bytes: Uint8Array): Promise<ExtractedQuestionBank> {
  const { readQuestionBankLines } = await import('./questionBankLines');
  const lines = await readQuestionBankLines(bytes);
  return {
    lines,
    totalCharacters: lines.reduce((total, line) => total + line.text.length, 0),
  };
}

/** Respuesta del worker: `empty` = PDF válido sin texto (no hace falta reintentar en proceso). */
type WorkerOutcome =
  | { kind: 'ok'; text: string; totalCharacters: number }
  | { kind: 'questionBank'; lines: QuestionBankLine[]; totalCharacters: number }
  | { kind: 'empty' }
  | { kind: 'failed'; reason: string };

interface WorkerInput {
  buffer?: Uint8Array;
  filePath?: string;
  maxChars: number;
  mode?: 'text' | 'questionBank';
}

function runPdfWorker(
  workerFile: string,
  workerData: WorkerInput,
  timeoutMs: number
): Promise<WorkerOutcome> {
  return new Promise((resolve, reject) => {
    console.info('[pdf-extract] starting worker', {
      workerFile,
      hasPath: Boolean(workerData.filePath),
      maxChars: workerData.maxChars,
      mode: workerData.mode ?? 'text',
    });
    const worker = new Worker(workerFile, { workerData });

    const timeout = setTimeout(() => {
      worker.terminate().catch(() => undefined);
      reject(
        new AppError(
          422,
          'La extracción del PDF tardó demasiado. Probá con un archivo más pequeño.'
        )
      );
    }, timeoutMs);

    worker.once(
      'message',
      (msg: { text?: string; totalCharacters?: number; lines?: QuestionBankLine[]; error?: string }) => {
        clearTimeout(timeout);
        if (msg.error) {
          console.error('[pdf-extract] worker reported error:', msg.error);
          resolve({ kind: 'failed', reason: msg.error });
          return;
        }
        if (Array.isArray(msg.lines)) {
          resolve({
            kind: 'questionBank',
            lines: msg.lines,
            totalCharacters: msg.totalCharacters ?? 0,
          });
          return;
        }
        const result = clipExtractedText(msg.text, workerData.maxChars);
        if (!result.text) {
          resolve({ kind: 'empty' });
          return;
        }
        resolve({
          kind: 'ok',
          text: result.text,
          totalCharacters: Math.max(result.totalCharacters, msg.totalCharacters ?? 0),
        });
      }
    );

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

/**
 * Bytes del PDF para el parser.
 *
 * Sin copias: `readFile` devuelve un Buffer y pdf-parse/pdfjs acepta el TypedArray
 * tal cual (se queda con la propiedad del array, así que el llamador no debe
 * reutilizarlo). Antes se hacía `new Uint8Array(buffer)`, que duplicaba en RAM
 * hasta 100 MB por PDF en el plan free de Render.
 */
async function loadPdfData(input: { buffer?: Buffer; filePath?: string }): Promise<Uint8Array> {
  if (input.filePath) {
    return fs.promises.readFile(input.filePath);
  }
  if (input.buffer) {
    return input.buffer;
  }
  throw new Error('Invalid PDF buffer');
}

async function extractPdf(
  input: { buffer?: Buffer; filePath?: string },
  maxChars: number
): Promise<ExtractedPdfText> {
  const workerFile = workerScriptPath();
  if (workerFile) {
    try {
      const outcome = await runPdfWorker(workerFile, { ...input, maxChars }, EXTRACT_TIMEOUT_MS);
      if (outcome.kind === 'ok') {
        return { text: outcome.text, totalCharacters: outcome.totalCharacters };
      }
      if (outcome.kind === 'empty') {
        // PDF válido sin texto (escaneado): reintentar en proceso daría lo mismo
        // y volvería a parsear el archivo completo.
        throw emptyTextError();
      }
      throw new AppError(
        422,
        'El archivo no es un PDF válido o no se pudo leer su contenido.',
        true,
        'PDF_PARSE_FAILED',
        outcome.kind === 'failed' ? outcome.reason.replace(/\s+/g, ' ').slice(0, 160) : undefined
      );
    } catch (error) {
      // Sólo se cae al parseo en proceso cuando el worker falló de verdad
      // (no cargó, se colgó, u reportó un PDF ilegible). Un PDF sin texto o un
      // timeout no se reintentan: sería pagar el parseo dos veces.
      const workerFallbackAllowed =
        !(error instanceof AppError) || error.code === 'PDF_PARSE_FAILED';
      if (!workerFallbackAllowed) throw error;
      console.warn('[pdf-extract] worker failed; extracting in process', errorMessage(error));
    }
  }

  let parsed: ExtractedPdfText;
  try {
    parsed = await extractInProcess(await loadPdfData(input), maxChars);
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

  if (!parsed.text) {
    throw emptyTextError();
  }
  return parsed;
}

/**
 * Líneas del PDF con la marca de subrayado resuelta (modo banco de preguntas).
 *
 * A diferencia del texto plano, acá NO se cae en silencio al parseo en proceso
 * cuando el worker falla: sin la detección de subrayado las respuestas saldrían
 * sin marcar, y una tarjeta con la respuesta equivocada es peor que un error
 * claro.
 */
async function extractQuestionBankPdf(input: {
  buffer?: Buffer;
  filePath?: string;
}): Promise<ExtractedQuestionBank> {
  const workerFile = workerScriptPath();
  if (!workerFile) {
    console.warn('[pdf-extract] no compiled worker; reading question bank in process');
    return extractQuestionBankInProcess(await loadPdfData(input));
  }

  let outcome: WorkerOutcome;
  try {
    outcome = await runPdfWorker(
      workerFile,
      { ...input, maxChars: 0, mode: 'questionBank' },
      QUESTION_BANK_EXTRACT_TIMEOUT_MS
    );
  } catch (error) {
    throw questionBankError(errorMessage(error).replace(/\s+/g, ' ').slice(0, 160));
  }

  if (outcome.kind === 'questionBank') {
    if (outcome.lines.length === 0) {
      throw new AppError(
        422,
        'No se encontró texto en el PDF. El modo banco de preguntas necesita un archivo con texto seleccionable.'
      );
    }
    return { lines: outcome.lines, totalCharacters: outcome.totalCharacters };
  }
  if (outcome.kind === 'empty') {
    throw emptyTextError();
  }
  throw questionBankError(
    outcome.kind === 'failed' ? outcome.reason.replace(/\s+/g, ' ').slice(0, 160) : undefined
  );
}

/**
 * Extrae texto leyendo el PDF desde disco (no duplica el archivo en el heap del proceso principal).
 *
 * `maxChars` acota el texto devuelto (default: el cap del mazo); `totalCharacters`
 * sigue siendo el recuento real del PDF.
 */
export async function extractPdfTextFromPath(
  filePath: string,
  maxChars: number = deckSourceTextCap()
): Promise<ExtractedPdfText> {
  return extractPdf({ filePath }, maxChars);
}

/**
 * Extrae el texto de un PDF en un worker thread (no bloquea el event loop).
 */
export async function extractPdfTextFromBuffer(
  buffer: Buffer,
  maxChars: number = deckSourceTextCap()
): Promise<ExtractedPdfText> {
  return extractPdf({ buffer }, maxChars);
}

/** Líneas con subrayado del PDF leído desde disco. */
export async function extractQuestionBankLinesFromPath(
  filePath: string
): Promise<ExtractedQuestionBank> {
  return extractQuestionBankPdf({ filePath });
}

/** Líneas con subrayado del PDF en memoria. */
export async function extractQuestionBankLinesFromBuffer(
  buffer: Buffer
): Promise<ExtractedQuestionBank> {
  return extractQuestionBankPdf({ buffer });
}
