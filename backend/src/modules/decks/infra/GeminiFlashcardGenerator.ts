import { IFlashcardGeneratorPort, GenerateOptions } from '../domain/IFlashcardGeneratorPort';
import { GeminiFailover } from '../../../core/ai/GeminiFailover';
import { AppError } from '../../../core/errors/AppError';
import { z } from 'zod';

/** Cada tarjeta debe traer pregunta y respuesta no vacías; el resto se descarta. */
const responseCardSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

export class GeminiFlashcardGenerator implements IFlashcardGeneratorPort {
  private readonly gemini: GeminiFailover;

  // Las peticiones a Gemini con textos enormes pueden tardar minutos o colgarse.
  // Limitamos el tamaño del prompt y el nº de tarjetas para mantener la app responsiva.
  private readonly MAX_TEXT_CHARS = 40000;
  private readonly DEFAULT_CARDS = 15;
  private readonly TIMEOUT_MS = 60000;

  constructor() {
    this.gemini = new GeminiFailover();
  }

  async generateFromText(text: string, options?: GenerateOptions): Promise<Array<{ question: string; answer: string }>> {
    const maxCards = options?.cardCount ?? this.DEFAULT_CARDS;
    const difficulty = options?.difficulty ?? 'medium';

    // Truncamos el texto si excede el límite para que la IA responda en tiempo razonable.
    let truncated = false;
    let promptText = text;
    if (promptText.length > this.MAX_TEXT_CHARS) {
      promptText = promptText.slice(0, this.MAX_TEXT_CHARS);
      truncated = true;
    }

    const truncationNotice = truncated
      ? `\n\nNOTA: El documento original era demasiado largo y solo tienes los primeros ${this.MAX_TEXT_CHARS} caracteres. Genera las tarjetas basándote en esta parte.\n`
      : '';

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
        extractConcepts: `EXTRACT REAL, COHERENTE, AND READABLE CONCEPTS.`,
        generateCards: `GENERATE AT MOST ${maxCards} FLASHCARDS, ONLY THE MOST IMPORTANT ONES.`,
        emptyText: `IF THE TEXT IS TOO SHORT OR EMPTY, RETURN AN EMPTY ARRAY [].`,
        difficultyLabel: `REQUESTED DIFFICULTY:`,
        returnFormat: `Return the output STRICTLY as a JSON array of objects with the exact keys: 'question' and 'answer'.
Do NOT include markdown blocks, greetings, or any other text. ONLY the JSON array.`,
        textToAnalyze: `Text to analyze:`
      }
    };

    const texts = promptTexts[isSpanish ? 'es' : 'en'];
    const languageName = isSpanish ? 'Español' : 'English';

    const truncationNotice = truncated
      ? isSpanish
        ? `\n\nNOTA: El documento original era demasiado largo y solo tienes los primeros ${this.MAX_TEXT_CHARS} caracteres. Genera las tarjetas basándote en esta parte.\n`
        : `\n\nNOTE: The original document was too long and you only have the first ${this.MAX_TEXT_CHARS} characters. Generate flashcards based on this part.\n`
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
${promptText}${truncationNotice}
    `;

    const result = await this.gemini.withFailover((client) =>
      client
        .getGenerativeModel({ model: 'gemini-2.5-flash' })
        .generateContent(prompt, { timeout: this.TIMEOUT_MS })
    );
    const responseText = result.response.text();
    
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
