import { IDeckRepository } from '../domain/IDeckRepository';
import { IStudySessionRepository } from '../domain/IStudySessionRepository';
import { AppError } from '../../../core/errors/AppError';

export interface SaveSessionInput {
  deckId: string;
  userId: string;
  currentIndex: number;
  results: Record<string, boolean>;
  flashcardsHash?: string | null;
  finished?: boolean;
}

export class SaveStudySessionUseCase {
  constructor(
    private readonly deckRepo: IDeckRepository,
    private readonly sessionRepo: IStudySessionRepository
  ) {}

  async execute(input: SaveSessionInput) {
    const deck = await this.deckRepo.findById(input.deckId);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }
    if (deck.userId !== input.userId) {
      throw new AppError(403, 'You do not have permission to save this study session');
    }
    if (!Number.isInteger(input.currentIndex) || input.currentIndex < 0) {
      throw new AppError(400, 'currentIndex must be an integer >= 0');
    }
    if (!input.results || typeof input.results !== 'object' || Array.isArray(input.results)) {
      throw new AppError(400, 'results must be an object mapping flashcardId to boolean');
    }
    for (const value of Object.values(input.results)) {
      if (typeof value !== 'boolean') {
        throw new AppError(400, 'results values must be booleans');
      }
    }
    const session = await this.sessionRepo.upsert({
      userId: input.userId,
      deckId: input.deckId,
      currentIndex: input.currentIndex,
      results: input.results,
      flashcardsHash: input.flashcardsHash ?? null,
      finished: input.finished ?? false,
    });
    return { session };
  }
}
