import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiFailover } from './GeminiFailover';
import { geminiModelCandidates, isGeminiModelNotFoundError } from './geminiModels';
import { generateWithGroq, isGroqConfigured } from './GroqClient';
import { QuotaExceededError } from '../errors/QuotaExceededError';
import { ModelOverloadedError } from '../errors/ModelOverloadedError';
import { AppError } from '../errors/AppError';

export type DeckLlmUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
};

export type DeckLlmResult = {
  text: string;
  finishReason?: string;
  usage?: DeckLlmUsage;
};

type GeminiPart = { text?: string; thought?: boolean };

type GeminiGenerateResult = {
  response: {
    text: () => string;
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: GeminiPart[] };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
      thoughtsTokenCount?: number;
    };
    promptFeedback?: { blockReason?: string };
  };
};

function readUsage(result: GeminiGenerateResult): DeckLlmUsage | undefined {
  const usageRaw = result.response.usageMetadata;
  if (!usageRaw) return undefined;
  return {
    promptTokenCount: usageRaw.promptTokenCount,
    candidatesTokenCount: usageRaw.candidatesTokenCount,
    totalTokenCount: usageRaw.totalTokenCount,
    thoughtsTokenCount: usageRaw.thoughtsTokenCount,
  };
}

function isMaxTokensFinishReason(reason: string | undefined): boolean {
  if (!reason) return false;
  return reason === 'MAX_TOKENS' || reason.endsWith('_MAX_TOKENS');
}

function readCandidateText(result: GeminiGenerateResult): string {
  try {
    const fromSdk = result.response.text()?.trim();
    if (fromSdk) return fromSdk;
  } catch {
    // SDK throws when there are no candidates / malformed JSON-mode payload.
  }
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => Boolean(part.text) && !part.thought)
    .map((part) => part.text as string)
    .join('')
    .trim();
}

/**
 * 2.5 Flash thinks by default. Thought tokens count against maxOutputTokens and
 * often yield empty JSON + finishReason MAX_TOKENS (the generator then 422s).
 * Budget 0 turns thinking off; the JS SDK still forwards unknown config keys.
 */
function deckGenerationConfig(maxOutputTokens: number | undefined, json: boolean) {
  return {
    temperature: 0.3,
    ...(json ? { responseMimeType: 'application/json' as const } : {}),
    ...(maxOutputTokens ? { maxOutputTokens } : {}),
    thinkingConfig: { thinkingBudget: 0 },
  };
}

function readGeminiLlmResponse(result: GeminiGenerateResult): DeckLlmResult {
  const blockReason = result.response.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AppError(
      502,
      'El servicio de IA no pudo procesar este documento. Probá con otro archivo o más tarde.',
      true,
      'AI_CONTENT_BLOCKED',
      sanitizeBlockReason(blockReason)
    );
  }

  const finishReason = result.response.candidates?.[0]?.finishReason;
  const text = readCandidateText(result);

  if (!text) {
    throw new Error(
      isMaxTokensFinishReason(finishReason)
        ? 'Gemini returned empty text (MAX_TOKENS; thinking likely consumed the budget).'
        : 'Gemini returned empty text.'
    );
  }

  return { text, finishReason, usage: readUsage(result) };
}

function sanitizeBlockReason(reason: string): string {
  return reason.replace(/\s+/g, ' ').trim().slice(0, 80);
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

/**
 * Recorre la cadena de modelos hasta que uno responda.
 *
 * La cuota del free tier y la saturación son **por modelo**
 * (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`): agotar `gemini-2.5-flash`
 * no dice nada de `gemini-3.5-flash`. Por eso las dos se resuelven probando el
 * siguiente modelo y no fallando.
 *
 * Antes esto cortaba con `throw` en el primer `ModelOverloadedError` o
 * `QuotaExceededError`, así que tener tres modelos configurados no servía de
 * nada: un 503 en el primero tumbaba la generación entera.
 */
async function runGeminiModelChain(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number,
  maxOutputTokens: number | undefined,
  json: boolean
): Promise<DeckLlmResult> {
  const models = geminiModelCandidates();
  let lastError: unknown;
  let quotaError: QuotaExceededError | undefined;
  let overloadError: ModelOverloadedError | undefined;

  for (const model of models) {
    try {
      const result = (await withTimeout(
        gemini.withFailover((client: GoogleGenerativeAI) =>
          client
            .getGenerativeModel({
              model,
              generationConfig: deckGenerationConfig(maxOutputTokens, json),
            })
            .generateContent(prompt)
        ),
        timeoutMs,
        'Gemini'
      )) as GeminiGenerateResult;
      if (model !== models[0]) {
        console.warn(`[AI] Gemini used fallback model "${model}".`);
      }
      // Texto vacío + MAX_TOKENS se deja fallar: el fallback JSON→texto reintenta sin thinking.
      return readGeminiLlmResponse(result);
    } catch (error) {
      lastError = error;
      if (error instanceof QuotaExceededError) {
        quotaError = quotaError ?? error;
        console.warn(`[AI] Gemini "${model}" out of quota; trying next model.`);
        continue;
      }
      if (error instanceof ModelOverloadedError) {
        overloadError = overloadError ?? error;
        console.warn(`[AI] Gemini "${model}" overloaded; trying next model.`);
        continue;
      }
      if (error instanceof AppError) {
        throw error;
      }
      if (isGeminiModelNotFoundError(error)) {
        console.warn(`[AI] Gemini model "${model}" not found; trying next.`);
        continue;
      }
      throw error;
    }
  }

  // Ningún modelo respondió: se informa el motivo más accionable.
  // Cuota gana a saturación porque dice cuándo vuelve a andar (resetAt real).
  if (quotaError) throw quotaError;
  if (overloadError) throw overloadError;
  throw lastError instanceof Error ? lastError : new Error('No Gemini model available.');
}

async function generateWithGeminiDeck(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number,
  maxOutputTokens?: number
): Promise<DeckLlmResult> {
  return runGeminiModelChain(gemini, prompt, timeoutMs, maxOutputTokens, true);
}

async function generateWithGemini(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number,
  maxOutputTokens?: number
): Promise<DeckLlmResult> {
  return runGeminiModelChain(gemini, prompt, timeoutMs, maxOutputTokens, false);
}

async function generateWithGeminiForDeck(
  gemini: GeminiFailover,
  prompt: string,
  timeoutMs: number,
  maxOutputTokens?: number
): Promise<DeckLlmResult> {
  try {
    return await generateWithGeminiDeck(gemini, prompt, timeoutMs, maxOutputTokens);
  } catch (jsonModeErr) {
    if (jsonModeErr instanceof QuotaExceededError || jsonModeErr instanceof ModelOverloadedError) {
      throw jsonModeErr;
    }
    if (jsonModeErr instanceof AppError) {
      throw jsonModeErr;
    }
    console.warn(
      '[AI] Gemini JSON mode failed for deck; retrying plain text.',
      jsonModeErr instanceof Error ? jsonModeErr.message : jsonModeErr
    );
    return generateWithGemini(gemini, prompt, timeoutMs, maxOutputTokens);
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
  options?: DeckLlmOptions
): Promise<DeckLlmResult> {
  return generateWithGeminiForDeck(gemini, prompt, timeoutMs, options?.maxTokens);
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
    const result = await generateWithGemini(gemini, prompt, timeoutMs);
    return result.text;
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
