import { PDFParse } from 'pdf-parse';
import { AppError } from '../../../core/errors/AppError';

/**
 * Extrae el texto de un PDF usando pdf-parse v2.
 * Lanza AppError(422) si no se puede extraer texto util.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const text = (result?.text || '').trim();

    if (!text) {
      throw new AppError(
        422,
        'No se pudo extraer texto del PDF. Asegúrate de que contenga texto real (no solo imágenes escaneadas).'
      );
    }

    return text;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      422,
      'El archivo no es un PDF válido o no se pudo leer su contenido.'
    );
  }
}