import { IDeckRepository } from '../domain/IDeckRepository';
import { ICloudStoragePort } from '../domain/ICloudStoragePort';
import { AppError } from '../../../core/errors/AppError';

export class DeleteDeckUseCase {
  constructor(
    private readonly deckRepo: IDeckRepository,
    private readonly cloudStorage: ICloudStoragePort
  ) {}

  async execute(deckId: string, userId: string): Promise<void> {
    const deck = await this.deckRepo.findById(deckId);
    
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }

    if (deck.userId !== userId) {
      throw new AppError(403, 'You do not have permission to delete this deck');
    }

    await this.deckRepo.delete(deckId);

    if (deck.pdfPublicId) {
      try {
        await this.cloudStorage.deletePdf(deck.pdfPublicId);
      } catch (cleanupError) {
        // No es crítico si falla la eliminación durante el borrado del deck
        console.error('No se pudo eliminar el PDF de Cloudinary durante la eliminación del deck:', cleanupError);
      }
    }
  }
}
