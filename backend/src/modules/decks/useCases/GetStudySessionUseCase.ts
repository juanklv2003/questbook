import { IDeckRepository } from '../domain/IDeckRepository';
import { IStudySessionRepository } from '../domain/IStudySessionRepository';
import { AppError } from '../../../core/errors/AppError';

export class GetStudySessionUseCase {
  constructor(
    private readonly deckRepo: IDeckRepository,
    private readonly sessionRepo: IStudySessionRepository
  ) {}

  async execute(deckId: string, userId: string) {
    const deck = await this.deckRepo.findById(deckId);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }
    if (deck.userId !== userId) {
      throw new AppError(403, 'You do not have permission to view this study session');
    }
    const session = await this.sessionRepo.find(userId, deckId);
    if (!session) {
      throw new AppError(404, 'Study session not found');
    }
    return { session };
  }
}
