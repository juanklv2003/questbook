import { IDeckRepository } from '../domain/IDeckRepository';
import { IFlashcardGeneratorPort } from '../domain/IFlashcardGeneratorPort';
import { IFlashcardRepository } from '../../flashcards/domain/IFlashcardRepository';
import { ICloudStoragePort } from '../domain/ICloudStoragePort';

interface GenerateDeckDTO {
  name: string;
  userId: string;
  folderId?: string;
  content: string;
  fileBuffer?: Buffer;
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
    const generatedCards = await this.aiGenerator.generateFromText(dto.content);
    
    if (!generatedCards || generatedCards.length === 0) {
      throw new Error('Failed to generate flashcards: No content generated.');
    }

    let pdfUrl: string | undefined;
    let pdfPublicId: string | undefined;

    if (dto.fileBuffer) {
      const uploadResult = await this.cloudStorage.uploadPdf(dto.fileBuffer);
      pdfUrl = uploadResult.url;
      pdfPublicId = uploadResult.publicId;
    }

    // 2. Create the Deck
    const deck = await this.deckRepo.create({
      name: dto.name,
      userId: dto.userId,
      folderId: dto.folderId,
      pdfUrl,
      pdfPublicId
    });

    // 3. Save Flashcards
    const flashcardData = generatedCards.map(card => ({
      deckId: deck.id,
      question: card.question,
      answer: card.answer
    }));

    const flashcards = await this.flashcardRepo.createMany(flashcardData);

    return {
      deckId: deck.id,
      name: deck.name,
      flashcardsCount: flashcards.length
    };
  }
}
