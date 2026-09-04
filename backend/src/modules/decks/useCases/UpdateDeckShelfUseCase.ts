import { IDeckRepository } from '../domain/IDeckRepository';
import { Deck } from '../domain/Deck';
import { AppError } from '../../../core/errors/AppError';

export const MAX_SHELF_INDEX = 2;

interface UpdateDeckShelfDTO {
  deckId: string;
  userId: string;
  shelfIndex: number;
  position: number;
}

export class UpdateDeckShelfUseCase {
  constructor(private readonly deckRepo: IDeckRepository) {}

  async execute(dto: UpdateDeckShelfDTO): Promise<Deck> {
    if (!Number.isInteger(dto.shelfIndex) || dto.shelfIndex < 0 || dto.shelfIndex > MAX_SHELF_INDEX) {
      throw new AppError(400, `shelf_index must be an integer between 0 and ${MAX_SHELF_INDEX}`);
    }
    if (!Number.isInteger(dto.position) || dto.position < 0) {
      throw new AppError(400, 'position must be an integer >= 0');
    }

    const deck = await this.deckRepo.findById(dto.deckId);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }
    if (deck.userId !== dto.userId) {
      throw new AppError(403, 'You do not have permission to move this deck');
    }

    const updated = await this.deckRepo.updateShelf(dto.deckId, dto.shelfIndex, dto.position);
    if (!updated) {
      throw new AppError(404, 'Deck not found');
    }
    return updated;
  }
}
