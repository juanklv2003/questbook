import { GoogleGenerativeAI } from '@google/generative-ai';
import { IEvaluatorPort } from '../domain/IEvaluatorPort';
import { env } from '../../../config/env';

export class GeminiEvaluator implements IEvaluatorPort {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async evaluate(question: string, correctAnswer: string, userAnswer: string): Promise<{
    score: number;
    isCorrect: boolean;
    feedback: string;
  }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You are a strict but fair teacher evaluating a student's answer to a flashcard.

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Evaluate the student's answer based on comprehension, not exact wording. Does it capture the core concept?
Return STRICTLY a JSON object with the following fields:
- 'score': an integer from 0 to 100 representing how correct the answer is.
- 'isCorrect': a boolean indicating if the answer is considered passing (score >= 70).
- 'feedback': a brief, constructive explanation of what was right, wrong, or missing (max 2 sentences).

Do NOT include markdown blocks, greetings, or any other text. ONLY the JSON object.
    `;

    const result = await model.generateContent(prompt);
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
