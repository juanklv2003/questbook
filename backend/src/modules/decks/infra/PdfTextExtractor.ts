import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';
import { AppError } from '../../../core/errors/AppError';

const EXTRACT_TIMEOUT_MS = 60_000;

function workerScriptPath(): string {
  const base = path.join(__dirname, '../../../workers/pdfExtractWorker');
  const jsPath = `${base}.js`;
  const tsPath = `${base}.ts`;
  if (fs.existsSync(jsPath)) {
    return jsPath;
  }
  return tsPath;
}

function workerExecArgv(workerFile: string): string[] | undefined {
  if (workerFile.endsWith('.js')) {
    return undefined;
  }
  return ['-r', 'ts-node/register'];
}

/**
 * Extrae el texto de un PDF en un worker thread (no bloquea el event loop).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const workerFile = workerScriptPath();
    const worker = new Worker(workerFile, {
      workerData: { buffer },
      execArgv: workerExecArgv(workerFile),
    });

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
        reject(
          new AppError(
            422,
            'El archivo no es un PDF válido o no se pudo leer su contenido.'
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
      reject(
        new AppError(
          422,
          'El archivo no es un PDF válido o no se pudo leer su contenido.'
        )
      );
      console.error('PDF extract worker error:', error);
    });

    worker.once('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
      }
    });
  });
}
