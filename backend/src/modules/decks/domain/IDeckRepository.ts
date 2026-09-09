import { Deck } from './Deck';

export interface IDeckRepository {
  create(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deck>;
  findById(id: string): Promise<Deck | null>;
  findAll(userId: string): Promise<Deck[]>;
  delete(deckId: string): Promise<void>;
  updateShelf(deckId: string, shelfIndex: number, position: number): Promise<Deck | null>;
  /**
   * Atomically accumulates one evaluation (studied+1, correct+(isCorrect?1:0))
   * and returns the recalculated progress. Null progress = no data yet
   * (only possible if the deck has zero evaluations).
   */
  recordEvaluation(deckId: string, isCorrect: boolean): Promise<{ deckId: string; progressPercent: number | null }>;
}
