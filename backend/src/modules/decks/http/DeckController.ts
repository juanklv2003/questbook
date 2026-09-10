import { Request, Response } from 'express';
import { GenerateDeckUseCase } from '../useCases/GenerateDeckUseCase';
import { GetDeckFlashcardsUseCase } from '../useCases/GetDeckFlashcardsUseCase';
import { ListDecksUseCase } from '../useCases/ListDecksUseCase';
import { DeleteDeckUseCase } from '../useCases/DeleteDeckUseCase';
import { UpdateDeckShelfUseCase } from '../useCases/UpdateDeckShelfUseCase';
import { GetStudySessionUseCase } from '../useCases/GetStudySessionUseCase';
import { SaveStudySessionUseCase } from '../useCases/SaveStudySessionUseCase';
import { DeleteStudySessionUseCase } from '../useCases/DeleteStudySessionUseCase';
import { catchAsync } from '../../../core/middlewares/catchAsync';
import { AppError } from '../../../core/errors/AppError';
import { extractTextFromPdf } from '../infra/PdfTextExtractor';

export class DeckController {
  constructor(
    private readonly generateDeckUseCase: GenerateDeckUseCase,
    private readonly getDeckFlashcardsUseCase: GetDeckFlashcardsUseCase,
    private readonly listDecksUseCase: ListDecksUseCase,
    private readonly deleteDeckUseCase: DeleteDeckUseCase,
    private readonly updateDeckShelfUseCase: UpdateDeckShelfUseCase,
    private readonly getStudySessionUseCase: GetStudySessionUseCase,
    private readonly saveStudySessionUseCase: SaveStudySessionUseCase,
    private readonly deleteStudySessionUseCase: DeleteStudySessionUseCase
  ) {
    this.generate = catchAsync(this.generate.bind(this));
    this.getFlashcards = catchAsync(this.getFlashcards.bind(this));
    this.listDecks = catchAsync(this.listDecks.bind(this));
    this.deleteDeck = catchAsync(this.deleteDeck.bind(this));
    this.updateShelf = catchAsync(this.updateShelf.bind(this));
    this.getSession = catchAsync(this.getSession.bind(this));
    this.saveSession = catchAsync(this.saveSession.bind(this));
    this.deleteSession = catchAsync(this.deleteSession.bind(this));
  }

  async generate(req: Request, res: Response) {
    const { name, folderId, content: reqContent, cardCount, difficulty, shelf_index, shelfIndex, color } = req.body;
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

    // Validate cardCount
    const parsedCardCount = cardCount ? Number(cardCount) : undefined;
    if (parsedCardCount !== undefined && (isNaN(parsedCardCount) || parsedCardCount < 1 || parsedCardCount > 50)) {
      throw new AppError(400, 'cardCount must be between 1 and 50');
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    const parsedDifficulty = difficulty || undefined;
    if (parsedDifficulty && !validDifficulties.includes(parsedDifficulty)) {
      throw new AppError(400, 'difficulty must be easy, medium, or hard');
    }

    const result = await this.generateDeckUseCase.execute({
      name,
      userId,
      folderId,
      content,
      fileBuffer: req.file?.buffer,
      fileName: req.file?.originalname,
      cardCount: parsedCardCount,
      difficulty: parsedDifficulty as 'easy' | 'medium' | 'hard' | undefined,
      shelfIndex: parseShelfIndex(shelf_index ?? shelfIndex),
      color: parseDeckColor(color),
    });

    res.status(201).json(result);
  }

  async getFlashcards(req: Request, res: Response) {
    const { deckId } = req.params;
    if (!deckId) {
      throw new AppError(400, 'Deck ID is required');
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const result = await this.getDeckFlashcardsUseCase.execute(deckId as string, userId);
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

  async updateShelf(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'Deck ID is required');
    }

    const rawShelf = req.body?.shelf_index ?? req.body?.shelfIndex;
    const rawPosition = req.body?.position;
    const shelfIndex = rawShelf === undefined ? undefined : Number(rawShelf);
    const position = rawPosition === undefined ? undefined : Number(rawPosition);

    if (shelfIndex === undefined || position === undefined || isNaN(shelfIndex) || isNaN(position)) {
      throw new AppError(400, 'shelf_index (0..2) and position (>= 0) are required');
    }

    const result = await this.updateDeckShelfUseCase.execute({
      deckId: id as string,
      userId,
      shelfIndex,
      position,
    });
    res.status(200).json(result);
  }

  async getSession(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'Deck ID is required');
    }
    const result = await this.getStudySessionUseCase.execute(id as string, userId);
    res.status(200).json(result);
  }

  async saveSession(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'Deck ID is required');
    }
    const { currentIndex, results, flashcardsHash, flashcards_hash, finished } = req.body ?? {};
    const result = await this.saveStudySessionUseCase.execute({
      deckId: id as string,
      userId,
      currentIndex,
      results,
      flashcardsHash: flashcardsHash ?? flashcards_hash ?? null,
      finished,
    });
    res.status(200).json(result);
  }

  async deleteSession(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, 'Deck ID is required');
    }
    // Explicit user action only. Finishing a session never deletes the row.
    await this.deleteStudySessionUseCase.execute(id as string, userId);
    res.status(204).send();
  }
}

function parseShelfIndex(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2) {
    throw new AppError(400, 'shelf_index must be an integer between 0 and 2');
  }
  return parsed;
}

const VALID_DECK_COLORS = ['primary', 'violet', 'emerald', 'amber', 'rose'] as const;

function parseDeckColor(raw: unknown): string {
  if (typeof raw !== 'string') return 'primary';
  const normalized = raw.trim().toLowerCase();
  return (VALID_DECK_COLORS as readonly string[]).includes(normalized) ? normalized : 'primary';
}
