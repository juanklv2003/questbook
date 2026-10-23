import fs from 'fs/promises';
import { parentPort, workerData } from 'worker_threads';
import { PDFParse } from 'pdf-parse';
import type { QuestionBankLine } from '../modules/decks/domain/questionBank';

type WorkerResult = {
  text?: string;
  totalCharacters?: number;
  lines?: QuestionBankLine[];
  error?: string;
};

type WorkerMode = 'text' | 'questionBank';

function workerMode(): WorkerMode {
  return workerData.mode === 'questionBank' ? 'questionBank' : 'text';
}

/** Tope de caracteres que se devuelven por IPC (0/ausente = sin tope). */
function maxChars(): number {
  const raw = workerData.maxChars as number | undefined;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : Number.MAX_SAFE_INTEGER;
}

/**
 * Bytes del PDF sin copias: el `workerData` ya es un clon propio del worker, así
 * que pasar el Buffer/Uint8Array directo a pdf-parse (que se queda con la
 * propiedad del array) evita duplicar hasta 100 MB en RAM.
 */
async function loadPdfBytes(): Promise<Uint8Array> {
  const filePath = workerData.filePath as string | undefined;
  if (filePath) {
    return fs.readFile(filePath);
  }

  const raw = workerData.buffer as Uint8Array | ArrayBuffer | { type?: string } | undefined;
  if (raw instanceof Uint8Array) {
    return raw;
  }
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  }
  if (raw && typeof raw === 'object' && 'type' in raw && raw.type === 'Buffer') {
    return Buffer.from(raw as never);
  }
  throw new Error('Invalid PDF buffer');
}

/**
 * Modo banco de preguntas: devuelve líneas visuales con la marca de subrayado.
 *
 * Se importa en caliente porque arrastra `pdfjs-dist` y `@napi-rs/canvas`
 * (binario nativo): la extracción de texto normal no debe pagar esa carga.
 */
async function extractQuestionBank(bytes: Uint8Array): Promise<WorkerResult> {
  const { readQuestionBankLines } = await import('../modules/decks/infra/questionBankLines');
  const lines = await readQuestionBankLines(bytes);
  return {
    lines,
    totalCharacters: lines.reduce((total, line) => total + line.text.length, 0),
  };
}

async function extractText(bytes: Uint8Array): Promise<WorkerResult> {
  const parser = new PDFParse({ data: bytes });
  const result = await parser.getText();
  // Se recorta acá, dentro del worker: el texto completo de un PDF largo
  // (2-3M de caracteres) no se clona por el canal de mensajes para que el
  // proceso principal lo tire con un `slice`.
  const full = (result?.text || '').trim();
  const cap = maxChars();
  const text = full.length > cap ? full.slice(0, cap) : full;
  return { text, totalCharacters: full.length };
}

(async () => {
  try {
    const bytes = await loadPdfBytes();
    const out = workerMode() === 'questionBank'
      ? await extractQuestionBank(bytes)
      : await extractText(bytes);
    parentPort?.postMessage(out);
  } catch (error) {
    const out: WorkerResult = { error: error instanceof Error ? error.message : String(error) };
    parentPort?.postMessage(out);
  }
})();
