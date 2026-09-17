import fs from 'fs/promises';
import { parentPort, workerData } from 'worker_threads';
import { PDFParse } from 'pdf-parse';

type WorkerResult = { text?: string; error?: string };

async function loadPdfBytes(): Promise<Uint8Array> {
  const filePath = workerData.filePath as string | undefined;
  if (filePath) {
    return new Uint8Array(await fs.readFile(filePath));
  }

  const raw = workerData.buffer as Buffer | Uint8Array | ArrayBuffer;
  if (Buffer.isBuffer(raw)) {
    return new Uint8Array(raw);
  }
  if (raw instanceof Uint8Array) {
    return raw;
  }
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  }
  if (raw && typeof raw === 'object' && 'type' in raw && (raw as { type?: string }).type === 'Buffer') {
    return new Uint8Array(Buffer.from(raw as Buffer));
  }
  throw new Error('Invalid PDF buffer');
}

(async () => {
  try {
    const bytes = await loadPdfBytes();
    const parser = new PDFParse({ data: bytes });
    const result = await parser.getText();
    const text = (result?.text || '').trim();
    const out: WorkerResult = { text };
    parentPort?.postMessage(out);
  } catch (error) {
    const out: WorkerResult = { error: error instanceof Error ? error.message : String(error) };
    parentPort?.postMessage(out);
  }
})();
