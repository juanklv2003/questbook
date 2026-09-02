import { IFlashcardGeneratorPort } from '../domain/IFlashcardGeneratorPort';
import { GeminiFailover } from '../../../core/ai/GeminiFailover';

export class GeminiFlashcardGenerator implements IFlashcardGeneratorPort {
  private readonly gemini: GeminiFailover;

  // Las peticiones a Gemini con textos enormes pueden tardar minutos o colgarse.
  // Limitamos el tamaño del prompt y el nº de tarjetas para mantener la app responsiva.
  private readonly MAX_TEXT_CHARS = 40000;
  private readonly MAX_CARDS = 15;
  private readonly TIMEOUT_MS = 60000;

  constructor() {
    this.gemini = new GeminiFailover();
  }

  async generateFromText(text: string): Promise<Array<{ question: string; answer: string }>> {
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

    const prompt = `
You are an expert educator. Your task is to analyze the provided text and generate high-quality flashcards for studying. Focus on key concepts, definitions, and relationships.

GENERA TODAS LAS PREGUNTAS Y RESPUESTAS ESTRICTAMENTE EN ESPAÑOL.
NO INVENTES INFORMACIÓN (0% alucinación).
BASATE ÚNICAMENTE EN EL TEXTO PROPORCIONADO.
EXTRAE CONCEPTOS REALES, COHERENTES Y LEGIBLES.
GENERA MÁXIMO ${this.MAX_CARDS} TARJETAS, sólo las más importantes.
Si el texto es demasiado corto o vacío, devuelve un array vacío [].

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
      return parsed;
    } catch (err) {
      console.error('Failed to parse Gemini output:', jsonStr);
      throw new Error('Failed to generate flashcards from text. Invalid format.');
    }
  }
}
