import { Flashcard } from './Flashcard';

export interface IFlashcardRepository {
  createMany(flashcards: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Flashcard[]>;
  findByDeckId(deckId: string): Promise<Flashcard[]>;
  findById(id: string): Promise<Flashcard | null>;
  /** Deletes a card scoped to its deck. Returns true when a row was removed. */
  deleteById(id: string, deckId: string): Promise<boolean>;
}
