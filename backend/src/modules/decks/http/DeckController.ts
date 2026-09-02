import { Request, Response } from 'express';
import { GenerateDeckUseCase } from '../useCases/GenerateDeckUseCase';
import { GetDeckFlashcardsUseCase } from '../useCases/GetDeckFlashcardsUseCase';
import { ListDecksUseCase } from '../useCases/ListDecksUseCase';
import { DeleteDeckUseCase } from '../useCases/DeleteDeckUseCase';
import { catchAsync } from '../../../core/middlewares/catchAsync';
import { AppError } from '../../../core/errors/AppError';
import { extractTextFromPdf } from '../infra/PdfTextExtractor';

export class DeckController {
  constructor(
    private readonly generateDeckUseCase: GenerateDeckUseCase,
    private readonly getDeckFlashcardsUseCase: GetDeckFlashcardsUseCase,
    private readonly listDecksUseCase: ListDecksUseCase,
    private readonly deleteDeckUseCase: DeleteDeckUseCase
  ) {
    this.generate = catchAsync(this.generate.bind(this));
    this.getFlashcards = catchAsync(this.getFlashcards.bind(this));
    this.listDecks = catchAsync(this.listDecks.bind(this));
    this.deleteDeck = catchAsync(this.deleteDeck.bind(this));
  }

  async generate(req: Request, res: Response) {
    const { name, folderId, content: reqContent } = req.body;
    let content = reqContent;
    
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (!name) {
      throw new AppError(400, 'Deck name is required');
    }

    if (req.file) {
      // Real PDF parsing: PDFs are binary — passing the buffer as utf-8 corrupts
      // the text and makes Gemini fail. Extract the readable text instead.
      content = await extractTextFromPdf(req.file.buffer);
    }

    if (!content) {
      throw new AppError(400, 'Either file or content is required');
    }

    const result = await this.generateDeckUseCase.execute({
      name,
      userId,
      folderId,
      content,
      fileBuffer: req.file?.buffer
    });

    res.status(201).json(result);
  }

  async getFlashcards(req: Request, res: Response) {
    const { deckId } = req.params;
    if (!deckId) {
      throw new AppError(400, 'Deck ID is required');
    }

    // Optional: Validate if the user owns the deck

    const result = await this.getDeckFlashcardsUseCase.execute(deckId as string);
    res.status(200).json(result);
  }

  async listDecks(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const result = await this.listDecksUseCase.execute(userId);
    res.status(200).json(result);
  }

  async deleteDeck(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'Deck ID is required');
    }

    await this.deleteDeckUseCase.execute(id as string, userId);
    res.status(204).send();
  }
}
