import { IFlashcardRepository } from '../../flashcards/domain/IFlashcardRepository';
import { IDeckRepository } from '../domain/IDeckRepository';
import { AppError } from '../../../core/errors/AppError';

export class GetDeckFlashcardsUseCase {
  constructor(
    private readonly flashcardRepo: IFlashcardRepository,
    private readonly deckRepo: IDeckRepository
  ) {}

  async execute(deckId: string, userId: string) {
    const deck = await this.deckRepo.findById(deckId);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }
    // Ownership: solo el dueño puede leer las tarjetas (y sus respuestas).
    if (deck.userId !== userId) {
      throw new AppError(403, 'No tienes permiso para ver este libro');
    }
    const flashcards = await this.flashcardRepo.findByDeckId(deckId);
    return { deck, flashcards };
  }
}
