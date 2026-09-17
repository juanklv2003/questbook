import { IFlashcardGeneratorPort, GenerateOptions } from '../domain/IFlashcardGeneratorPort';
import { DECK_PRACTICAL_TEXT_CAP } from '../domain/deckGenerationLimits';
import { GeminiFailover } from '../../../core/ai/GeminiFailover';
import { generateDeckLlmText } from '../../../core/ai/generateLlmText';
import { groqMaxTokensForDeckBatch } from '../../../core/ai/GroqClient';
import { parseFlashcardJsonArray } from './deckFlashcardJsonParser';
import { env } from '../../../config/env';
import { AppError } from '../../../core/errors/AppError';
import { QuotaExceededError } from '../../../core/errors/QuotaExceededError';
import { ModelOverloadedError } from '../../../core/errors/ModelOverloadedError';
import type { Difficulty } from '../domain/IFlashcardGeneratorPort';
import { z } from 'zod';

/** Cada tarjeta debe traer pregunta y respuesta no vacías; el resto se descarta. */
const responseCardSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

type PassContext = {
  deadlineMs: number;
  batchIndex: number;
  batchTotal: number;
  batchesRemaining: number;
};

function isRecoverableAiError(err: unknown): err is AppError {
  return (
    err instanceof AppError &&
    (err.statusCode === 502 || err.statusCode === 504) &&
    Boolean(err.code?.startsWith('AI_'))
  );
}

function minPartialCards(requested: number): number {
  return Math.max(8, Math.ceil(requested * 0.25));
}

function isAiTimeoutMessage(detail: string): boolean {
  const d = detail.toLowerCase();
  return d.includes('timed out') || d.includes('timeout');
}

export class GeminiFlashcardGenerator implements IFlashcardGeneratorPort {
  private readonly gemini: GeminiFailover;

  // Las peticiones a Gemini con textos enormes pueden tardar minutos o colgarse.
  // Limitamos el tamaño del prompt (PDF_MAX_TEXT_CHARS) y el timeout (AI_DECK_TIMEOUT_MS).
  private readonly DEFAULT_CARDS = 15;

  constructor() {
    this.gemini = new GeminiFailover();
  }

  private get maxTextChars(): number {
    return env.PDF_MAX_TEXT_CHARS;
  }

  /** Smaller batches for hard decks — large JSON arrays often truncate and fail parse. */
  private batchLimitFor(totalCards: number, difficulty?: Difficulty): number {
    if (totalCards <= 15) return totalCards;
    if (difficulty === 'hard') {
      return totalCards > 30 ? 10 : 12;
    }
    if (totalCards > 30) return 20;
    return 20;
  }

  private computeDeadlineMs(totalCards: number, batchLimit: number): number {
    const batches = Math.max(1, Math.ceil(totalCards / batchLimit));
    const perBatchMs = env.AI_DECK_TIMEOUT_MS;
    // +50% slack: empty-batch splits can double LLM calls within a batch.
    const computed = Math.ceil(perBatchMs * batches * 1.5);
    const cap = env.AI_DECK_TOTAL_TIMEOUT_MS;
    return Date.now() + Math.min(cap, computed);
  }

  private timeoutForBatch(deadlineMs: number, batchesRemaining: number): number {
    const remaining = deadlineMs - Date.now();
    if (remaining <= 0) return 0;
    const fairShare = Math.floor(remaining / Math.max(1, batchesRemaining));
    return Math.max(15_000, Math.min(env.AI_DECK_TIMEOUT_MS, fairShare));
  }

  private assertDeadline(deadlineMs: number): void {
    if (deadlineMs - Date.now() <= 0) {
      throw new AppError(
        504,
        'La generación de tarjetas tardó demasiado. Probá con menos tarjetas o un documento más corto.',
        true,
        'AI_TIMEOUT'
      );
    }
  }

  async generateFromText(text: string, options?: GenerateOptions): Promise<Array<{ question: string; answer: string }>> {
    const maxCards = options?.cardCount ?? this.DEFAULT_CARDS;
    const batchLimit = this.batchLimitFor(maxCards, options?.difficulty);
    const batchTotal = Math.max(1, Math.ceil(maxCards / batchLimit));
    const deadlineMs = this.computeDeadlineMs(maxCards, batchLimit);
    console.info('[deck-gen] start', {
      cardCount: maxCards,
      difficulty: options?.difficulty ?? 'medium',
      contentChars: text.length,
      batchLimit,
      batchTotal,
    });

    if (maxCards <= batchLimit) {
      return this.generatePass(text, options, maxCards, [], {
        deadlineMs,
        batchIndex: 1,
        batchTotal: 1,
        batchesRemaining: 1,
      });
    }

    const cards: Array<{ question: string; answer: string }> = [];
    let batchIndex = 0;
    while (cards.length < maxCards) {
      batchIndex += 1;
      this.assertDeadline(deadlineMs);
      const need = Math.min(batchLimit, maxCards - cards.length);
      const batchesRemaining = batchTotal - batchIndex + 1;
      try {
        const batch = await this.generatePass(
          text,
          options,
          need,
          cards.map((c) => c.question),
          { deadlineMs, batchIndex, batchTotal, batchesRemaining }
        );
        if (batch.length === 0) break;
        cards.push(...batch);
      } catch (err) {
        if (isRecoverableAiError(err) && cards.length >= minPartialCards(maxCards)) {
          console.warn('[deck-gen] partial deck after AI failure', {
            have: cards.length,
            want: maxCards,
            batch: `${batchIndex}/${batchTotal}`,
          });
          return cards.slice(0, maxCards);
        }
        throw err;
      }
    }

    if (cards.length === 0) {
      throw new AppError(
        422,
        'La IA no pudo generar tarjetas válidas de este documento. Probá con otro archivo o intentá de nuevo.'
      );
    }
    return cards.slice(0, maxCards);
  }

  private async generatePass(
    text: string,
    options: GenerateOptions | undefined,
    maxCards: number,
    existingQuestions: string[],
    passCtx: PassContext
  ): Promise<Array<{ question: string; answer: string }>> {
    const cards = await this.generatePassOnce(text, options, maxCards, existingQuestions, passCtx);
    if (cards.length > 0) return cards;

    if (maxCards > 6) {
      const firstHalf = Math.floor(maxCards / 2);
      const secondHalf = maxCards - firstHalf;
      console.warn('[deck-gen] empty batch; splitting', {
        batch: `${passCtx.batchIndex}/${passCtx.batchTotal}`,
        maxCards,
        firstHalf,
        secondHalf,
      });
      const first = await this.generatePassOnce(text, options, firstHalf, existingQuestions, passCtx);
      let second: Array<{ question: string; answer: string }> = [];
      try {
        second = await this.generatePassOnce(
          text,
          options,
          secondHalf,
          [...existingQuestions, ...first.map((c) => c.question)],
          passCtx
        );
      } catch (err) {
        if (first.length > 0 && isRecoverableAiError(err)) {
          console.warn('[deck-gen] split batch: second half failed; keeping first', {
            first: first.length,
            secondHalf,
          });
          return first;
        }
        throw err;
      }
      return [...first, ...second].slice(0, maxCards);
    }

    throw new AppError(
      422,
      'La IA no pudo generar tarjetas válidas de este documento. Probá con otro archivo o intentá de nuevo.'
    );
  }

  private async generatePassOnce(
    text: string,
    options: GenerateOptions | undefined,
    maxCards: number,
    existingQuestions: string[],
    passCtx: PassContext
  ): Promise<Array<{ question: string; answer: string }>> {
    const difficulty = options?.difficulty ?? 'medium';
    const textCap = Math.min(this.maxTextChars, DECK_PRACTICAL_TEXT_CAP);

    let truncated = false;
    let promptText = text;
    if (promptText.length > textCap) {
      promptText = promptText.slice(0, textCap);
      truncated = true;
    }

    // Determine language for prompt text
    const isSpanish = options?.language === 'es';

    // Language-specific difficulty instructions
    const difficultyInstructions: Record<string, Record<string, string>> = {
      es: {
        easy: `NIVEL FÁCIL — Genera tarjetas enfocadas en:
- Definiciones simples y directas de conceptos clave
- Términos básicos y su significado
- Ideas principales del texto, sin detalles complejos
- Preguntas que requieran recordar o reconocer información
- Respuestas cortas y claras (1-2 oraciones máximo)`,

        medium: `NIVEL MEDIO — Genera tarjetas con dificultad equilibrada:
- Mezcla de definiciones y relaciones entre conceptos
- Preguntas que conecten ideas del texto
- Algunas preguntas de comprensión (no solo memorización)
- Respuestas de extensión media (2-3 oraciones)
- Incluye ejemplos cuando el texto los tenga`,

        hard: `NIVEL DIFÍCIL — Genera tarjetas avanzadas y desafiantes:
- Relaciones complejas entre múltiples conceptos
- Preguntas que requieran análisis, comparación o síntesis
- Detalles específicos, matices y excepciones
- Preguntas de razonamiento (¿por qué?, ¿cómo se relaciona con...?)
- Respuestas detalladas que demuestren comprensión profunda
- Incluye preguntas tipo "¿cuál es la diferencia entre X e Y?"`,
      },
      en: {
        easy: `EASY LEVEL — Generate flashcards focused on:
- Simple and direct definitions of key concepts
- Basic terms and their meanings
- Main ideas from the text, without complex details
- Questions that require recalling or recognizing information
- Short and clear answers (1-2 sentences maximum)`,

        medium: `MEDIUM LEVEL — Generate flashcards with balanced difficulty:
- Mix of definitions and relationships between concepts
- Questions that connect ideas from the text
- Some comprehension questions (not just memorization)
- Medium-length answers (2-3 sentences)
- Include examples when the text has them`,

        hard: `HARD LEVEL — Generate advanced and challenging flashcards:
- Complex relationships between multiple concepts
- Questions requiring analysis, comparison, or synthesis
- Specific details, nuances, and exceptions
- Reasoning questions (why?, how does it relate to...?)
- Detailed answers demonstrating deep understanding
- Include questions like "what is the difference between X and Y?"`,
      },
    };

    // Language-specific prompt texts
    const promptTexts: Record<string, Record<string, string>> = {
      es: {
        opening: `Eres un educador experto. Tu tarea es analizar el texto proporcionado y generar tarjetas de estudio de alta calidad. Enfócate en conceptos clave, definiciones y relaciones.`,
        languageCommand: `GENERA TODAS LAS PREGUNTAS Y RESPUESTAS ESTRICTAMENTE EN ESPAÑOL.`,
        noHallucination: `NO INVENTES INFORMACIÓN (0% alucinación).`,
        baseText: `BASATE ÚNICAMENTE EN EL TEXTO PROPORCIONADO.`,
        extractConcepts: `EXTRAE CONCEPTOS REALES, COHERENTES Y LEGIBLES.`,
        generateCards: `GENERA MÁXIMO ${maxCards} TARJETAS, sólo las más importantes.`,
        emptyText: `Si el texto es demasiado corto o vacío, devuelve un array vacío [].`,
        difficultyLabel: `DIFICULTAD SOLICITADA:`,
        returnFormat: `Devuelve el resultado ESTRICTAMENTE como un array JSON de objetos con las claves exactas: 'question' y 'answer'.
No incluyas bloques de markdown, saludos, o cualquier otro texto. SOLO el array JSON.`,
        textToAnalyze: `Texto para analizar:`,
      },
      en: {
        opening: `You are an expert educator. Your task is to analyze the provided text and generate high-quality flashcards for studying. Focus on key concepts, definitions, and relationships.`,
        languageCommand: `GENERATE ALL QUESTIONS AND ANSWERS STRICTLY IN ENGLISH.`,
        noHallucination: `DO NOT INVENT INFORMATION (0% hallucination).`,
        baseText: `BASE YOURSELF UNIQUELY ON THE PROVIDED TEXT.`,
        extractConcepts: `EXTRACT REAL, COHERENT, AND READABLE CONCEPTS.`,
        generateCards: `GENERATE AT MOST ${maxCards} FLASHCARDS, ONLY THE MOST IMPORTANT ONES.`,
        emptyText: `IF THE TEXT IS TOO SHORT OR EMPTY, RETURN AN EMPTY ARRAY [].`,
        difficultyLabel: `REQUESTED DIFFICULTY:`,
        returnFormat: `Return the output STRICTLY as a JSON array of objects with the exact keys: 'question' and 'answer'.
Do NOT include markdown blocks, greetings, or any other text. ONLY the JSON array.`,
        textToAnalyze: `Text to analyze:`,
      },
    };

    const texts = promptTexts[isSpanish ? 'es' : 'en'];

    const truncationNotice = truncated
      ? isSpanish
        ? `\n\nNOTA: El documento original era demasiado largo y solo tienes los primeros ${textCap} caracteres. Genera las tarjetas basándote en esta parte.\n`
        : `\n\nNOTE: The original document was too long and you only have the first ${textCap} characters. Generate flashcards based on this part.\n`
      : '';

    const excludeNotice =
      existingQuestions.length > 0
        ? isSpanish
          ? `\n\nNO repitas ni parafrasees estas preguntas ya generadas (generá otras distintas del mismo texto):\n${existingQuestions
              .slice(-20)
              .map((q) => `- ${q.slice(0, 140)}`)
              .join('\n')}\n`
          : `\n\nDO NOT repeat or paraphrase these questions already generated (create different ones from the same text):\n${existingQuestions
              .slice(-20)
              .map((q) => `- ${q.slice(0, 140)}`)
              .join('\n')}\n`
        : '';

    const prompt = `
${texts.opening}

${texts.languageCommand}
${texts.noHallucination}
${texts.baseText}
${texts.extractConcepts}
${texts.generateCards}
${texts.emptyText}

${texts.difficultyLabel}
${difficultyInstructions[isSpanish ? 'es' : 'en'][difficulty]}

${texts.returnFormat}

${texts.textToAnalyze}
${promptText}${truncationNotice}${excludeNotice}
    `;

    const timeoutMs = this.timeoutForBatch(passCtx.deadlineMs, passCtx.batchesRemaining);
    if (timeoutMs <= 0) {
      throw new AppError(
        504,
        'La generación de tarjetas tardó demasiado. Probá con menos tarjetas o un documento más corto.',
        true,
        'AI_TIMEOUT'
      );
    }
    const maxTokens = groqMaxTokensForDeckBatch(maxCards, options?.difficulty);
    const startedAt = Date.now();

    let responseText = '';
    let lastAiError = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        responseText = await generateDeckLlmText(this.gemini, prompt, timeoutMs, { maxTokens });
        lastAiError = '';
        break;
      } catch (apiErr) {
        if (apiErr instanceof QuotaExceededError || apiErr instanceof ModelOverloadedError) {
          throw apiErr;
        }
        lastAiError = apiErr instanceof Error ? apiErr.message : String(apiErr);
        const durationMs = Date.now() - startedAt;
        console.error('[deck-gen] AI batch failed', {
          batch: `${passCtx.batchIndex}/${passCtx.batchTotal}`,
          need: maxCards,
          attempt,
          promptChars: prompt.length,
          timeoutMs,
          durationMs,
          err: lastAiError,
        });
        if (attempt >= 2) {
          if (isAiTimeoutMessage(lastAiError)) {
            throw new AppError(
              504,
              'La generación de tarjetas tardó demasiado. Probá con menos tarjetas o un documento más corto.',
              true,
              'AI_TIMEOUT'
            );
          }
          throw new AppError(
            502,
            'Error al comunicarse con el servicio de IA. Probá de nuevo en unos segundos.',
            true,
            'AI_PROVIDER_ERROR'
          );
        }
      }
    }

    console.info('[deck-gen] AI batch ok', {
      batch: `${passCtx.batchIndex}/${passCtx.batchTotal}`,
      need: maxCards,
      promptChars: prompt.length,
      durationMs: Date.now() - startedAt,
    });

    const parsedRaw = parseFlashcardJsonArray(responseText);
    if (!parsedRaw) {
      console.error('[deck-gen] failed to parse LLM output', {
        batch: `${passCtx.batchIndex}/${passCtx.batchTotal}`,
        need: maxCards,
        preview: responseText.slice(0, 400),
      });
      return [];
    }

    const cards = parsedRaw
      .map((item) => responseCardSchema.safeParse(item))
      .filter((r): r is { success: true; data: { question: string; answer: string } } => r.success)
      .map((r) => ({ question: r.data.question, answer: r.data.answer }))
      .slice(0, maxCards);

    if (cards.length === 0) {
      console.warn('[deck-gen] parsed array had no valid cards', {
        batch: `${passCtx.batchIndex}/${passCtx.batchTotal}`,
        need: maxCards,
        rawCount: parsedRaw.length,
      });
    }

    return cards;
  }
}
