export interface IFlashcardGeneratorPort {
  generateFromText(text: string): Promise<Array<{ question: string; answer: string }>>;
}
