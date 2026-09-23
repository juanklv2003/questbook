export interface IEvaluatorPort {
  evaluate(question: string, correctAnswer: string, userAnswer: string): Promise<{
    isCorrect: boolean;
    feedback: string;
  }>;
}
