import { IDeckRepository } from '../domain/IDeckRepository';
import { Deck } from '../domain/Deck';

export class ListDecksUseCase {
  constructor(private readonly deckRepo: IDeckRepository) {}

  async execute(userId: string): Promise<Deck[]> {
    return await this.deckRepo.findAll(userId);
  }
}
