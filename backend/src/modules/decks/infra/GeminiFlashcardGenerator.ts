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

    // Instrucciones de dificultad según el nivel seleccionado
    const difficultyInstructions: Record<string, string> = {
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
    };

    const prompt = `
You are an expert educator. Your task is to analyze the provided text and generate high-quality flashcards for studying. Focus on key concepts, definitions, and relationships.

GENERA TODAS LAS PREGUNTAS Y RESPUESTAS ESTRICTAMENTE EN ESPAÑOL.
NO INVENTES INFORMACIÓN (0% alucinación).
BASATE ÚNICAMENTE EN EL TEXTO PROPORCIONADO.
EXTRAE CONCEPTOS REALES, COHERENTES Y LEGIBLES.
GENERA MÁXIMO ${maxCards} TARJETAS, sólo las más importantes.
Si el texto es demasiado corto o vacío, devuelve un array vacío [].

DIFICULTAD SOLICITADA:
${difficultyInstructions[difficulty]}

Return the output STRICTLY as a JSON array of objects with the exact keys: 'question' and 'answer'.
Do NOT include markdown blocks, greetings, or any other text. ONLY the JSON array.

Text to analyze:
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
