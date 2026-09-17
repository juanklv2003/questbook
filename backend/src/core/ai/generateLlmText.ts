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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function generateWithGeminiDeck(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  const result = await withTimeout(
    gemini.withFailover((client: GoogleGenerativeAI) =>
      client.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }).generateContent(prompt)
    ),
    timeoutMs,
    'Gemini'
  );
  return readGeminiText(result);
}

async function generateWithGemini(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  const result = await withTimeout(
    gemini.withFailover((client: GoogleGenerativeAI) =>
      client.getGenerativeModel({ model: GEMINI_MODEL }).generateContent(prompt)
    ),
    timeoutMs,
    'Gemini'
  );
  return readGeminiText(result);
}

async function generateWithGeminiForDeck(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  try {
    return await generateWithGeminiDeck(gemini, prompt, timeoutMs);
  } catch (jsonModeErr) {
    console.warn(
      '[AI] Gemini JSON mode failed for deck; retrying plain text.',
      jsonModeErr instanceof Error ? jsonModeErr.message : jsonModeErr
    );
    return generateWithGemini(gemini, prompt, timeoutMs);
  }
}

export type DeckLlmOptions = {
  maxTokens?: number;
};

/**
 * Generación de mazos: solo Gemini (JSON + texto). No usamos Groq aquí: prompts con
 * decenas de miles de caracteres superan ITPM de Qwen en tier on_demand.
 */
export async function generateDeckLlmText(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number,
  _options?: DeckLlmOptions
): Promise<string> {
  return generateWithGeminiForDeck(gemini, prompt, timeoutMs);
}

/**
 * Evaluaciones y otros flujos: Gemini primero, Groq si falla.
 */
export async function generateLlmText(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  try {
    return await generateWithGemini(gemini, prompt, timeoutMs);
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
