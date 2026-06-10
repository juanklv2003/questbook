export interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  createdAt: Date;
  updatedAt: Date;
}
