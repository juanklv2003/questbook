import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiFailover } from './GeminiFailover';
import { generateWithGroq, isGroqConfigured } from './GroqClient';
import { QuotaExceededError } from '../errors/QuotaExceededError';
import { ModelOverloadedError } from '../errors/ModelOverloadedError';

const GEMINI_MODEL = 'gemini-2.5-flash';

function readGeminiText(result: { response: { text: () => string } }): string {
  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error('Gemini returned empty text.');
  }
  return text;
}

/**
 * 1) Gemini (rotación GEMINI_API_KEY / GEMINI_API_KEYS / GEMINI_API_KEY2)
 * 2) Si Gemini falla y hay GROQ_API_KEY → Groq (timeout, bloqueos, cuota, saturación, etc.)
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
    return readGeminiText(result);
  } catch (error) {
    if (!isGroqConfigured()) {
      throw error;
    }
    const reason =
      error instanceof QuotaExceededError || error instanceof ModelOverloadedError
        ? 'quota or overload'
        : 'primary provider error';
    console.warn(`[AI] Gemini failed (${reason}); trying Groq fallback.`);
    try {
      return await generateWithGroq(prompt, timeoutMs);
    } catch (groqErr) {
      if (error instanceof QuotaExceededError || error instanceof ModelOverloadedError) {
        throw error;
      }
      throw groqErr;
    }
  }
}
