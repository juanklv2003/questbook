import { env } from '../../config/env';
import { QuotaExceededError } from '../errors/QuotaExceededError';
import { isQuotaExhausted, parseRetryDelay } from './GeminiFailover';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
/** Groq context is smaller than Gemini; truncate fallback prompts. */
const GROQ_MAX_PROMPT_CHARS = 96_000;

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

/**
 * Respaldo cuando todas las claves Gemini agotaron cuota (429).
 * Requiere GROQ_API_KEY en el entorno.
 */
export async function generateWithGroq(prompt: string, timeoutMs: number): Promise<string> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    throw new QuotaExceededError(
      60,
      undefined,
      'Has alcanzado el límite gratuito de la IA. Inténtalo de nuevo más tarde.'
    );
  }

  let safePrompt = prompt;
  if (safePrompt.length > GROQ_MAX_PROMPT_CHARS) {
    safePrompt =
      safePrompt.slice(0, GROQ_MAX_PROMPT_CHARS) +
      '\n\n[Nota: el documento se truncó para el respaldo de IA.]';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages: [{ role: 'user', content: safePrompt }],
        temperature: 0.3,
        max_tokens: 16_384,
      }),
      signal: controller.signal,
    });

    const body = (await response.json()) as GroqChatResponse;

    if (!response.ok) {
      const errLike = { status: response.status, message: body.error?.message ?? response.statusText };
      if (isQuotaExhausted(errLike)) {
        const retryAfterSeconds = parseRetryDelay(errLike);
        throw new QuotaExceededError(
          retryAfterSeconds,
          new Date(Date.now() + retryAfterSeconds * 1000).toISOString(),
          'Has alcanzado el límite gratuito de la IA (Gemini y Groq). Inténtalo de nuevo más tarde.'
        );
      }
      throw new Error(body.error?.message ?? `Groq HTTP ${response.status}`);
    }

    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('Groq returned an empty response.');
    }
    return text;
  } catch (error: unknown) {
    if (error instanceof QuotaExceededError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Groq request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function isGroqConfigured(): boolean {
  return Boolean(env.GROQ_API_KEY);
}

export { DEFAULT_GROQ_MODEL };
