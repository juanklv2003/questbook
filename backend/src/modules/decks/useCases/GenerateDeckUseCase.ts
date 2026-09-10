import { IDeckRepository } from '../domain/IDeckRepository';
import { IFlashcardGeneratorPort, Difficulty } from '../domain/IFlashcardGeneratorPort';
import { IFlashcardRepository } from '../../flashcards/domain/IFlashcardRepository';
import { ICloudStoragePort } from '../domain/ICloudStoragePort';
import { AppError } from '../../../core/errors/AppError';

interface GenerateDeckDTO {
  name: string;
  userId: string;
  folderId?: string;
  content: string;
  fileBuffer?: Buffer;
  fileName?: string;
  cardCount?: number;
  difficulty?: Difficulty;
  shelfIndex?: number;
  color?: string;
}

export class GenerateDeckUseCase {
  constructor(
    private readonly deckRepo: IDeckRepository,
    private readonly aiGenerator: IFlashcardGeneratorPort,
    private readonly flashcardRepo: IFlashcardRepository,
    private readonly cloudStorage: ICloudStoragePort
  ) {}

  async execute(dto: GenerateDeckDTO) {
    // 1. Generate flashcards from content
    const generatedCards = await this.aiGenerator.generateFromText(dto.content, {
      cardCount: dto.cardCount,
      difficulty: dto.difficulty,
    });

    if (!generatedCards || generatedCards.length === 0) {
      throw new AppError(422, 'La IA no pudo generar tarjetas para este contenido. Probá de nuevo.');
    }

    let pdfUrl: string | undefined;
    let pdfPublicId: string | undefined;

    try {
      if (dto.fileBuffer) {
        const uploadResult = await this.cloudStorage.uploadPdf(dto.fileBuffer, dto.fileName);
        pdfUrl = uploadResult.url;
        pdfPublicId = uploadResult.publicId;
      }

      // 2. Create the Deck
      const deck = await this.deckRepo.create({
        name: dto.name,
        userId: dto.userId,
        folderId: dto.folderId,
        pdfUrl,
        pdfPublicId,
        shelfIndex: dto.shelfIndex ?? 0,
        position: 0,
        color: dto.color ?? 'primary',
      });

      // 3. Save Flashcards
      const flashcardData = generatedCards.map((card) => ({
        deckId: deck.id,
        question: card.question,
        answer: card.answer,
      }));

      const flashcards = await this.flashcardRepo.createMany(flashcardData);

      return {
        deckId: deck.id,
        name: deck.name,
        color: deck.color ?? 'primary',
        flashcardsCount: flashcards.length,
      };
    } catch (error) {
      // Compensación: si algo falla tras subir el PDF a Cloudinary (INSERT del
      // deck o de las tarjetas), eliminamos el archivo remoto para no dejar
      // huérfanos pagando almacenamiento.
      if (pdfPublicId) {
        try {
          await this.cloudStorage.deletePdf(pdfPublicId);
        } catch (cleanupError) {
          console.error('No se pudo limpiar el PDF huérfano en Cloudinary:', cleanupError);
        }
      }
      throw error;
    }
  }
}
