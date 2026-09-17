import { env } from '../../config/env';
import { QuotaExceededError } from '../errors/QuotaExceededError';
import { isQuotaExhausted, parseRetryDelay } from './GeminiFailover';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Groq: gpt-oss suele llenar `reasoning` y dejar `content` vacío; qwen devuelve JSON usable. */
export const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';
const GROQ_MODEL_FALLBACKS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b'] as const;
/** Groq context is smaller than Gemini; truncate fallback prompts. */
const GROQ_MAX_PROMPT_CHARS = 96_000;

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function groqModelCandidates(): string[] {
  const configured = env.GROQ_MODEL?.trim();
  const base = [...GROQ_MODEL_FALLBACKS];
  const list = configured ? [configured, ...base] : base;
  const unique = [...new Set(list)];
  const qwen = 'qwen/qwen3.8-27b';
  if (unique.includes(qwen)) {
    return [qwen, ...unique.filter((m) => m !== qwen)];
  }
  return unique;
}

function isUnknownGroqModel(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('does not exist') || m.includes('decommissioned') || m.includes('not have access');
}

export type GroqGenerateOptions = {
  maxTokens?: number;
};

async function callGroqModel(
  apiKey: string,
  model: string,
  safePrompt: string,
  signal: AbortSignal,
  maxTokens: number
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
      max_tokens: maxTokens,
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

  const message = body.choices?.[0]?.message;
  const content = message?.content?.trim() ?? '';
  const reasoning =
    message && typeof message === 'object' && 'reasoning' in message
      ? String((message as { reasoning?: string }).reasoning ?? '').trim()
      : '';
  const text = content.includes('[') ? content : content || reasoning;
  if (!text) {
    throw new Error('Groq returned an empty response.');
  }
  return text;
}

export function groqMaxTokensForDeckBatch(cardCount: number, difficulty?: 'easy' | 'medium' | 'hard'): number {
  const perCard = difficulty === 'hard' ? 1_100 : difficulty === 'easy' ? 650 : 850;
  return Math.min(32_768, 2_048 + cardCount * perCard);
}

/**
 * Respaldo cuando Gemini no responde. Requiere GROQ_API_KEY en el entorno.
 */
export async function generateWithGroq(
  prompt: string,
  timeoutMs: number,
  options?: GroqGenerateOptions
): Promise<string> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    throw new QuotaExceededError(
      60,
      undefined,
      'Has alcanzado el límite gratuito de la IA. Inténtalo de nuevo más tarde.'
    );
  }

  const maxTokens = options?.maxTokens ?? 16_384;

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
        const text = await callGroqModel(apiKey, model, safePrompt, controller.signal, maxTokens);
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
