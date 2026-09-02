import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';

/**
 * Determina si un error de Gemini corresponde a que la clave agotó su cuota/uso
 * (HTTP 429 RESOURCE_EXHAUSTED) o límite de tasa. Solo en estos casos tiene
 * sentido saltar a la siguiente clave.
 */
export function isQuotaExhausted(error: any): boolean {
  if (!error) return false;
  const status = error?.status ?? error?.statusCode ?? error?.response?.status;
  if (status === 429) return true;
  const message = String(error?.message || '') + ' ' + String(error?.details || '');
  const lowered = message.toLowerCase();
  return (
    lowered.includes('resource_exhausted') ||
    lowered.includes('quota') ||
    lowered.includes('rate limit') ||
    lowered.includes('429')
  );
}

/**
 * Gestor de claves de Gemini con failover automático.
 *
 * Si la clave actual devuelve un error de cuota (429 / RESOURCE_EXHAUSTED),
 * rota a la siguiente clave de la lista e intenta de nuevo. Los errores que
 * NO sean de cuota (p.ej. clave inválida, timeout, error de formato) NO
 * provocan cambio de clave y se propagan directamente.
 */
export class GeminiFailover {
  private readonly keys: string[];
  private currentIndex = 0;

  constructor(keys: string[] = env.GEMINI_API_KEYS) {
    if (!keys || keys.length === 0) {
      throw new Error('Se necesita al menos una API key de Gemini.');
    }
    this.keys = keys;
  }

  /**
   * Ejecuta `fn` con la clave actual; si falla por cuota, reintenta con las
   * siguientes claves. `fn` recibe el cliente GoogleGenerativeAI de la clave.
   */
  async withFailover<T>(fn: (client: GoogleGenerativeAI) => Promise<T>): Promise<T> {
    const attempts = this.keys.length;
    let lastError: any = null;

    for (let i = 0; i < attempts; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      try {
        const client = new GoogleGenerativeAI(this.keys[idx]);
        const result = await fn(client);
        // Recordar la clave que funcionó para la siguiente llamada.
        this.currentIndex = idx;
        return result;
      } catch (error: any) {
        lastError = error;
        if (isQuotaExhausted(error)) {
          console.warn(
            `[Gemini] La clave ${idx + 1} de ${this.keys.length} agotó su uso ` +
            `(${error?.message || error?.status || 'quota'}). Cambiando a la siguiente...`
          );
          continue;
        }
        throw error;
      }
    }

    // Todas las claves agotadas: lanzamos un error claro y en español para el usuario.
    throw new Error(
      'Todas las claves de Gemini han agotado su uso. Revisa tu cuota en https://aistudio.google.com/apikey'
    );
  }
}