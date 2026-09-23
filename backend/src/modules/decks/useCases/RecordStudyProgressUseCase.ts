import { IDeckRepository } from '../domain/IDeckRepository';
import { AppError } from '../../../core/errors/AppError';

export class RecordStudyProgressUseCase {
  constructor(private readonly deckRepo: IDeckRepository) {}

  async execute(deckId: string, userId: string, isCorrect: boolean) {
    const deck = await this.deckRepo.findById(deckId);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }
    if (deck.userId !== userId) {
      throw new AppError(403, 'You do not have permission to update this deck');
    }
    return await this.deckRepo.recordEvaluation(deckId, isCorrect);
  }
}
