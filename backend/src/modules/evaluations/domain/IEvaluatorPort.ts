export interface IEvaluatorPort {
  evaluate(question: string, correctAnswer: string, userAnswer: string): Promise<{
    score: number;
    isCorrect: boolean;
    feedback: string;
  }>;
}
