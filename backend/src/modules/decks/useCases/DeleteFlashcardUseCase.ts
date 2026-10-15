import { IFlashcardRepository } from '../../flashcards/domain/IFlashcardRepository';
import { IDeckRepository } from '../domain/IDeckRepository';
import { AppError } from '../../../core/errors/AppError';

export class DeleteFlashcardUseCase {
  constructor(
    private readonly flashcardRepo: IFlashcardRepository,
    private readonly deckRepo: IDeckRepository
  ) {}

  async execute(deckId: string, cardId: string, userId: string): Promise<void> {
    const deck = await this.deckRepo.findById(deckId);

    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    if (deck.userId !== userId) {
      throw new AppError(403, 'You do not have permission to delete this flashcard');
    }

    const deleted = await this.flashcardRepo.deleteById(cardId, deckId);

    if (!deleted) {
      throw new AppError(404, 'Flashcard not found');
    }
  }
}
