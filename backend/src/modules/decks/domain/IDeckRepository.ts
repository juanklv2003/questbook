import { Deck } from './Deck';

export interface IDeckRepository {
  create(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deck>;
  findById(id: string): Promise<Deck | null>;
  findAll(userId: string): Promise<Deck[]>;
  delete(deckId: string): Promise<void>;
}
