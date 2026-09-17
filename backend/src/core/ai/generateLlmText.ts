import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiFailover } from './GeminiFailover';
import { generateWithGroq, isGroqConfigured } from './GroqClient';
import { QuotaExceededError } from '../errors/QuotaExceededError';
import { ModelOverloadedError } from '../errors/ModelOverloadedError';

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * 1) Gemini (rotación GEMINI_API_KEY / GEMINI_API_KEYS / GEMINI_API_KEY2)
 * 2) Si Gemini agota cuota (429) o el modelo está saturado (503) → Groq (GROQ_API_KEY)
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
    const tryGroq =
      isGroqConfigured() &&
      (error instanceof QuotaExceededError || error instanceof ModelOverloadedError);
    if (!tryGroq) {
      throw error;
    }
    console.warn('[AI] Gemini unavailable (quota or overload); trying Groq fallback.');
    return generateWithGroq(prompt, timeoutMs);
  }
}
