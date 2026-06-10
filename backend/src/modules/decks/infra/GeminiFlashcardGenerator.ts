import { GoogleGenerativeAI } from '@google/generative-ai';
import { IFlashcardGeneratorPort } from '../domain/IFlashcardGeneratorPort';
import { env } from '../../../config/env';

export class GeminiFlashcardGenerator implements IFlashcardGeneratorPort {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async generateFromText(text: string): Promise<Array<{ question: string; answer: string }>> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You are an expert educator. Your task is to analyze the provided text and generate high-quality flashcards for studying. Focus on key concepts, definitions, and relationships.

GENERA TODAS LAS PREGUNTAS Y RESPUESTAS ESTRICTAMENTE EN ESPAÑOL.
NO INVENTES INFORMACIÓN (0% alucinación).
BASATE ÚNICAMENTE EN EL TEXTO PROPORCIONADO.
EXTRAE CONCEPTOS REALES, COHERENTES Y LEGIBLES.

Return the output STRICTLY as a JSON array of objects with the exact keys: 'question' and 'answer'.
Do NOT include markdown blocks, greetings, or any other text. ONLY the JSON array.

Text to analyze:
${text}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Attempt to parse JSON safely, sometimes AI still wraps in markdown
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('\`\`\`json')) {
      jsonStr = jsonStr.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
    } else if (jsonStr.startsWith('\`\`\`')) {
      jsonStr = jsonStr.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
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
