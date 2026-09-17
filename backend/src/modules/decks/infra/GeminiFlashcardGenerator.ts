import { IFlashcardGeneratorPort, GenerateOptions } from '../domain/IFlashcardGeneratorPort';
import { GeminiFailover } from '../../../core/ai/GeminiFailover';
import { generateDeckLlmText } from '../../../core/ai/generateLlmText';
import { env } from '../../../config/env';
import { AppError } from '../../../core/errors/AppError';
import { QuotaExceededError } from '../../../core/errors/QuotaExceededError';
import { ModelOverloadedError } from '../../../core/errors/ModelOverloadedError';
import { z } from 'zod';

/** Cada tarjeta debe traer pregunta y respuesta no vacías; el resto se descarta. */
const responseCardSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

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

  /** Menos texto en el prompt = respuestas más rápidas y menos 502 por timeout. */
  private static readonly PRACTICAL_TEXT_CAP = 50_000;
  private static readonly BATCH_CARD_LIMIT = 10;

  private timeoutMsFor(cardCount: number): number {
    const base = Math.min(env.AI_DECK_TIMEOUT_MS, 90_000);
    const extra = Math.max(0, cardCount - 10) * 2_500;
    return Math.min(120_000, base + extra);
  }

  async generateFromText(text: string, options?: GenerateOptions): Promise<Array<{ question: string; answer: string }>> {
    const maxCards = options?.cardCount ?? this.DEFAULT_CARDS;
    if (maxCards <= GeminiFlashcardGenerator.BATCH_CARD_LIMIT) {
      return this.generatePass(text, options, maxCards, []);
    }

    const cards: Array<{ question: string; answer: string }> = [];
    while (cards.length < maxCards) {
      const need = Math.min(GeminiFlashcardGenerator.BATCH_CARD_LIMIT, maxCards - cards.length);
      const batch = await this.generatePass(
        text,
        options,
        need,
        cards.map((c) => c.question)
      );
      if (batch.length === 0) break;
      cards.push(...batch);
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
    existingQuestions: string[]
  ): Promise<Array<{ question: string; answer: string }>> {
    const difficulty = options?.difficulty ?? 'medium';
    const textCap = Math.min(this.maxTextChars, GeminiFlashcardGenerator.PRACTICAL_TEXT_CAP);

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
        textToAnalyze: `Texto para analizar:`
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
        textToAnalyze: `Text to analyze:`
      }
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
              .slice(-35)
              .map((q) => `- ${q.slice(0, 140)}`)
              .join('\n')}\n`
          : `\n\nDO NOT repeat or paraphrase these questions already generated (create different ones from the same text):\n${existingQuestions
              .slice(-35)
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

    // Attempt to generate content and parse JSON safely
    let responseText = '';
    try {
      responseText = await generateDeckLlmText(this.gemini, prompt, this.timeoutMsFor(maxCards));
    } catch (apiErr) {
      if (apiErr instanceof QuotaExceededError || apiErr instanceof ModelOverloadedError) {
        throw apiErr;
      }
      const detail = apiErr instanceof Error ? apiErr.message : String(apiErr);
      console.error('Deck AI call failed:', detail);
      throw new AppError(
        502,
        'Error al comunicarse con el servicio de IA. Probá de nuevo en unos segundos.'
      );
    }

    // Attempt to parse JSON safely, sometimes AI still wraps in markdown
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        throw new Error('Gemini response is not a JSON array.');
      }

      // Validamos cada tarjeta y descartamos las que no tengan question/answer
      // (evita insertar `undefined` en columnas NOT NULL). Además acotamos la
      // respuesta al máximo pedido por si el modelo se excede.
      const cards = parsed
        .map((item) => responseCardSchema.safeParse(item))
        .filter((r): r is { success: true; data: { question: string; answer: string } } => r.success)
        .map((r) => ({ question: r.data.question, answer: r.data.answer }))
        .slice(0, maxCards);

      if (cards.length === 0) {
        throw new AppError(
          422,
          'La IA no pudo generar tarjetas válidas de este documento. Probá con otro archivo o intentá de nuevo.'
        );
      }
      return cards;
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error('Failed to parse Gemini output:', jsonStr);
      throw new AppError(
        422,
        'La IA no pudo generar tarjetas de este documento. Probá de nuevo en unos segundos.'
      );
    }
  }
}
