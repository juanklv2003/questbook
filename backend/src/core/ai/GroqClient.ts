import { env } from '../../config/env';
import { QuotaExceededError } from '../errors/QuotaExceededError';
import { isQuotaExhausted, parseRetryDelay } from './GeminiFailover';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Groq retiró llama-3.3-70b-versatile; modelos actuales en free tier (mar 2026). */
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';
const GROQ_MODEL_FALLBACKS = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'] as const;
/** Groq context is smaller than Gemini; truncate fallback prompts. */
const GROQ_MAX_PROMPT_CHARS = 96_000;

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function groqModelCandidates(): string[] {
  const configured = env.GROQ_MODEL?.trim();
  const list = configured ? [configured, ...GROQ_MODEL_FALLBACKS] : [...GROQ_MODEL_FALLBACKS];
  return [...new Set(list)];
}

function isUnknownGroqModel(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('does not exist') || m.includes('decommissioned') || m.includes('not have access');
}

async function callGroqModel(
  apiKey: string,
  model: string,
  safePrompt: string,
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: safePrompt }],
      temperature: 0.3,
      max_tokens: 16_384,
    }),
    signal,
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
}

/**
 * Respaldo cuando Gemini no responde. Requiere GROQ_API_KEY en el entorno.
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

  const models = groqModelCandidates();
  let lastError: unknown;

  try {
    for (const model of models) {
      try {
        const text = await callGroqModel(apiKey, model, safePrompt, controller.signal);
        if (model !== models[0]) {
          console.warn(`[AI] Groq succeeded with fallback model "${model}".`);
        }
        return text;
      } catch (error: unknown) {
        lastError = error;
        if (error instanceof QuotaExceededError) throw error;
        const msg = error instanceof Error ? error.message : '';
        if (isUnknownGroqModel(msg)) {
          console.warn(`[AI] Groq model "${model}" unavailable; trying next.`);
          continue;
        }
        throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Groq: no models available.');
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
