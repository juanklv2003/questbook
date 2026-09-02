export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GenerateOptions {
  cardCount?: number;
  difficulty?: Difficulty;
}

export interface IFlashcardGeneratorPort {
  generateFromText(text: string, options?: GenerateOptions): Promise<Array<{ question: string; answer: string }>>;
}
