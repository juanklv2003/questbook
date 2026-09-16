import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiFailover } from './GeminiFailover';
import { generateWithGroq, isGroqConfigured } from './GroqClient';
import { QuotaExceededError } from '../errors/QuotaExceededError';

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * 1) Gemini (rotación GEMINI_API_KEY / GEMINI_API_KEYS / GEMINI_API_KEY2)
 * 2) Si todas las claves Gemini devuelven cuota → Groq (GROQ_API_KEY)
 */
export async function generateLlmText(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  try {
    const result = await gemini.withFailover((client: GoogleGenerativeAI) =>
      client.getGenerativeModel({ model: GEMINI_MODEL }).generateContent(prompt, {
        timeout: timeoutMs,
      })
    );
    return result.response.text();
  } catch (error) {
    if (!(error instanceof QuotaExceededError) || !isGroqConfigured()) {
      throw error;
    }
    console.warn('[AI] Gemini quota exhausted; trying Groq fallback.');
    return generateWithGroq(prompt, timeoutMs);
  }
}
