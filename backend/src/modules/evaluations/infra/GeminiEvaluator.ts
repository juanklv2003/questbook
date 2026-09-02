import { IEvaluatorPort } from '../domain/IEvaluatorPort';
import { GeminiFailover } from '../../../core/ai/GeminiFailover';

export class GeminiEvaluator implements IEvaluatorPort {
  private readonly gemini: GeminiFailover;
  private readonly TIMEOUT_MS = 30000;

  constructor() {
    this.gemini = new GeminiFailover();
  }

  async evaluate(question: string, correctAnswer: string, userAnswer: string): Promise<{
    score: number;
    isCorrect: boolean;
    feedback: string;
  }> {
    const prompt = `
Eres un profesor estricto pero justo que evalúa la respuesta de un estudiante a una tarjeta de estudio.
Tanto la pregunta, como la respuesta correcta y la respuesta del estudiante están en español.

Pregunta: ${question}
Respuesta correcta: ${correctAnswer}
Respuesta del estudiante: ${userAnswer}

Evalúa la respuesta del estudiante basándote en la comprensión del concepto, no en que use las mismas palabras.
Responde ÚNICAMENTE con un objeto JSON con estos campos:
- 'score': un número entero del 0 al 100 que indique lo correcta que es la respuesta.
- 'isCorrect': un booleano que indique si la respuesta se considera aprobada (score >= 70).
- 'feedback': una explicación breve y constructiva de qué estuvo bien, mal o faltó (máximo 2 frases).

IMPORTANTE: El campo 'feedback' debe escribirse SIEMPRE EN ESPAÑOL, nunca en inglés. Usa un tono amable y motivador, en segunda persona, hablándole directamente al estudiante (por ejemplo: "Tu respuesta es demasiado vaga... Intenta mencionar...").

No incluyas bloques de markdown, saludos ni ningún otro texto. SOLO el objeto JSON.
    `;

    const result = await this.gemini.withFailover((client) =>
      client
        .getGenerativeModel({ model: 'gemini-2.5-flash' })
        .generateContent(prompt, { timeout: this.TIMEOUT_MS })
    );
    const responseText = result.response.text();
    
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('\`\`\`json')) {
      jsonStr = jsonStr.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
    } else if (jsonStr.startsWith('\`\`\`')) {
      jsonStr = jsonStr.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        score: parsed.score,
        isCorrect: parsed.isCorrect,
        feedback: parsed.feedback
      };
    } catch (err) {
      console.error('Failed to parse Gemini output:', jsonStr);
      throw new Error('Failed to evaluate answer. Invalid format.');
    }
  }
}
