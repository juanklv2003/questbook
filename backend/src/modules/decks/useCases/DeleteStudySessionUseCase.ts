import { IDeckRepository } from '../domain/IDeckRepository';
import { IStudySessionRepository } from '../domain/IStudySessionRepository';
import { AppError } from '../../../core/errors/AppError';

export class DeleteStudySessionUseCase {
  constructor(
    private readonly deckRepo: IDeckRepository,
    private readonly sessionRepo: IStudySessionRepository
  ) {}

  async execute(deckId: string, userId: string): Promise<void> {
    const deck = await this.deckRepo.findById(deckId);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }
    if (deck.userId !== userId) {
      throw new AppError(403, 'You do not have permission to delete this study session');
    }
    // Explicit user action only. No TTL, no auto-clear on finish.
    await this.sessionRepo.delete(userId, deckId);
  }
}
