import { parentPort, workerData } from 'worker_threads';
import { PDFParse } from 'pdf-parse';

type WorkerResult = { text?: string; error?: string };

(async () => {
  try {
    const raw = workerData.buffer as Buffer | Uint8Array | ArrayBuffer;
    let bytes: Uint8Array;
    if (Buffer.isBuffer(raw)) {
      bytes = new Uint8Array(raw);
    } else if (raw instanceof Uint8Array) {
      bytes = raw;
    } else if (raw instanceof ArrayBuffer) {
      bytes = new Uint8Array(raw);
    } else if (raw && typeof raw === 'object' && 'type' in raw && (raw as { type?: string }).type === 'Buffer') {
      bytes = new Uint8Array(Buffer.from(raw as Buffer));
    } else {
      const out: WorkerResult = { error: 'Invalid PDF buffer' };
      parentPort?.postMessage(out);
      return;
    }
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
