import { Request, Response } from 'express';
import { z } from 'zod';
import { GenerateDeckUseCase } from '../useCases/GenerateDeckUseCase';
import { GetDeckFlashcardsUseCase } from '../useCases/GetDeckFlashcardsUseCase';
import { ListDecksUseCase } from '../useCases/ListDecksUseCase';
import { DeleteDeckUseCase } from '../useCases/DeleteDeckUseCase';
import { UpdateDeckShelfUseCase } from '../useCases/UpdateDeckShelfUseCase';
import { GetStudySessionUseCase } from '../useCases/GetStudySessionUseCase';
import { SaveStudySessionUseCase } from '../useCases/SaveStudySessionUseCase';
import { DeleteStudySessionUseCase } from '../useCases/DeleteStudySessionUseCase';
import { RecordStudyProgressUseCase } from '../useCases/RecordStudyProgressUseCase';
import { catchAsync } from '../../../core/middlewares/catchAsync';
import { AppError } from '../../../core/errors/AppError';
import { parseBody } from '../../../core/validation/parseBody';
import { extractPdfTextFromBuffer } from '../infra/PdfTextExtractor';
import { capDeckSourceText, deckSourceTextCap } from '../domain/deckGenerationLimits';
import { cloudinaryAttachmentMaxBytes } from '../../../config/uploadLimits';
import { combinePdfUploads, measurePdfCharacters } from '../infra/combinePdfUploads';
import { fetchPdfBufferForDeck } from '../infra/fetchCloudinaryPdf';
import type { ICloudStoragePort } from '../domain/ICloudStoragePort';
import type { ITokenServicePort } from '../../auth/domain/ITokenServicePort';
import { env } from '../../../config/env';

// Todos los IDs de la app son UUID v4 generados por Postgres (gen_random_uuid).
// Validar el formato en el router evita 500 por IDs malformados y da un 400
// claro.
const deckIdSchema = z.uuid('ID de libro inválido');

type UploadedFilesMap = Record<string, Express.Multer.File[]>;

function collectUploadedPdfs(req: Request): Express.Multer.File[] {
  const raw = req.files as UploadedFilesMap | Express.Multer.File[] | undefined;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    return [...(raw.files ?? []), ...(raw.file ?? [])];
  }
  if (req.file) return [req.file];
  return [];
}

// PATCH /:id/session — cuerpo validado con zod. `finished` opcional conserva la
// fila para revisión; nunca se borra en este endpoint.
const sessionBodySchema = z.object({
  currentIndex: z.number().int().min(0),
  results: z.record(z.string(), z.boolean()),
  flashcardsHash: z.string().nullable().optional(),
  flashcards_hash: z.string().nullable().optional(),
  finished: z.boolean().optional(),
});

const studyProgressBodySchema = z.object({
  isCorrect: z.boolean(),
});

export class DeckController {
  constructor(
    private readonly generateDeckUseCase: GenerateDeckUseCase,
    private readonly getDeckFlashcardsUseCase: GetDeckFlashcardsUseCase,
    private readonly listDecksUseCase: ListDecksUseCase,
    private readonly deleteDeckUseCase: DeleteDeckUseCase,
    private readonly updateDeckShelfUseCase: UpdateDeckShelfUseCase,
    private readonly getStudySessionUseCase: GetStudySessionUseCase,
    private readonly saveStudySessionUseCase: SaveStudySessionUseCase,
    private readonly deleteStudySessionUseCase: DeleteStudySessionUseCase,
    private readonly recordStudyProgressUseCase: RecordStudyProgressUseCase,
    private readonly cloudStorage: ICloudStoragePort,
    private readonly tokenService: ITokenServicePort
  ) {
    this.generate = catchAsync(this.generate.bind(this));
    this.getPdfUploadParams = catchAsync(this.getPdfUploadParams.bind(this));
    this.createDirectUploadToken = catchAsync(this.createDirectUploadToken.bind(this));
    this.getFlashcards = catchAsync(this.getFlashcards.bind(this));
    this.listDecks = catchAsync(this.listDecks.bind(this));
    this.deleteDeck = catchAsync(this.deleteDeck.bind(this));
    this.updateShelf = catchAsync(this.updateShelf.bind(this));
    this.getSession = catchAsync(this.getSession.bind(this));
    this.saveSession = catchAsync(this.saveSession.bind(this));
    this.deleteSession = catchAsync(this.deleteSession.bind(this));
    this.recordStudyProgress = catchAsync(this.recordStudyProgress.bind(this));
    this.previewPdfText = catchAsync(this.previewPdfText.bind(this));
  }

  async getPdfUploadParams(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    res.status(200).json(this.cloudStorage.getSignedPdfUploadParams());
  }

  /** Short-lived JWT so the browser can POST a large PDF directly to Render (bypasses Vercel). */
  async createDirectUploadToken(req: Request, res: Response) {
    const user = req.user;
    if (!user?.userId || !user.email) {
      throw new AppError(401, 'Unauthorized');
    }
    if (!env.API_PUBLIC_BASE_URL) {
      throw new AppError(
        503,
        'La subida de PDFs grandes no está configurada en el servidor (API_PUBLIC_BASE_URL).'
      );
    }
    const expiresInSeconds = 900;
    const token = this.tokenService.generateToken(
      { userId: user.userId, email: user.email },
      `${expiresInSeconds}s`
    );
    res.status(200).json({
      token,
      uploadUrl: `${env.API_PUBLIC_BASE_URL}/decks/generate`,
      expiresInSeconds,
      cloudinaryMaxPdfBytes: env.CLOUDINARY_MAX_PDF_BYTES,
    });
  }

  async generate(req: Request, res: Response) {
    const { name, folderId, content: reqContent, cardCount, difficulty, shelf_index, shelfIndex, color, language, pdfUrl, pdfPublicId } =
      req.body;
    let content = reqContent;
    let uploadedPdfUrl: string | undefined;
    let uploadedPdfPublicId: string | undefined;

    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (!name) {
      throw new AppError(400, 'Deck name is required');
    }

    const uploadedPdfs = collectUploadedPdfs(req);
    if (uploadedPdfs.length > 0) {
      const combined = await combinePdfUploads(uploadedPdfs);
      content = combined.content;
      console.info('[deck-gen] pdf uploads combined', {
        files: uploadedPdfs.length,
        skippedFiles: combined.skippedFiles,
        contentChars: combined.content.length,
        totalCharacters: combined.totalCharacters,
        cap: deckSourceTextCap(),
      });

      const cloudinaryStoreMaxBytes = cloudinaryAttachmentMaxBytes();
      let pdfBuffer: Buffer | undefined;
      let storePdfOnCloudinary = false;
      if (
        combined.firstPdfBuffer &&
        combined.firstPdfBuffer.length <= cloudinaryStoreMaxBytes
      ) {
        pdfBuffer = combined.firstPdfBuffer;
        storePdfOnCloudinary = true;
      }

      const parsedCardCountEarly = cardCount ? Number(cardCount) : undefined;
      if (
        parsedCardCountEarly !== undefined &&
        (isNaN(parsedCardCountEarly) || parsedCardCountEarly < 1 || parsedCardCountEarly > 50)
      ) {
        throw new AppError(400, 'cardCount must be between 1 and 50');
      }

      const validDifficulties = ['easy', 'medium', 'hard'];
      const parsedDifficultyEarly = difficulty || undefined;
      if (parsedDifficultyEarly && !validDifficulties.includes(parsedDifficultyEarly)) {
        throw new AppError(400, 'difficulty must be easy, medium, or hard');
      }

      const parsedLanguageEarly = language || 'es';
      if (parsedLanguageEarly !== 'en' && parsedLanguageEarly !== 'es') {
        throw new AppError(400, 'language must be either "en" or "es"');
      }

      const result = await this.generateDeckUseCase.execute({
        name,
        userId,
        folderId,
        content,
        fileBuffer: storePdfOnCloudinary ? pdfBuffer : undefined,
        fileName: combined.firstPdfName ?? uploadedPdfs[0]?.originalname,
        cardCount: parsedCardCountEarly,
        difficulty: parsedDifficultyEarly as 'easy' | 'medium' | 'hard' | undefined,
        shelfIndex: parseShelfIndex(shelf_index ?? shelfIndex),
        color: parseDeckColor(color),
        language: parsedLanguageEarly,
      });

      res.status(201).json(result);
      return;
    } else if (typeof pdfUrl === 'string' && typeof pdfPublicId === 'string' && pdfUrl.trim() && pdfPublicId.trim()) {
      const buffer = await fetchPdfBufferForDeck(pdfPublicId.trim(), pdfUrl.trim());
      const extracted = await extractPdfTextFromBuffer(buffer);
      content = capDeckSourceText(extracted.text);
      console.info('[deck-gen] cloudinary pdf extracted', {
        contentChars: content.length,
        totalCharacters: extracted.totalCharacters,
        cap: deckSourceTextCap(),
      });
      uploadedPdfUrl = pdfUrl.trim();
      uploadedPdfPublicId = pdfPublicId.trim();
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

    // Validate language (optional, default to 'es')
    const parsedLanguage = language || 'es';
    if (parsedLanguage !== 'en' && parsedLanguage !== 'es') {
      throw new AppError(400, 'language must be either "en" or "es"');
    }

    const result = await this.generateDeckUseCase.execute({
      name,
      userId,
      folderId,
      content,
      pdfUrl: uploadedPdfUrl,
      pdfPublicId: uploadedPdfPublicId,
      cardCount: parsedCardCount,
      difficulty: parsedDifficulty as 'easy' | 'medium' | 'hard' | undefined,
      shelfIndex: parseShelfIndex(shelf_index ?? shelfIndex),
      color: parseDeckColor(color),
      language: parsedLanguage,
    });

    res.status(201).json(result);
  }

  async getFlashcards(req: Request, res: Response) {
    // Auth first: unauthenticated callers get 401 even for malformed ids.
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const deckId = parseBody(deckIdSchema, req.params.deckId ?? '');

    const result = await this.getDeckFlashcardsUseCase.execute(deckId, userId);
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
    // Auth first: unauthenticated callers get 401 even for malformed ids.
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const deckId = parseBody(deckIdSchema, req.params.id ?? '');

    await this.deleteDeckUseCase.execute(deckId, userId);
    res.status(204).send();
  }

  async updateShelf(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const deckId = parseBody(deckIdSchema, req.params.id ?? '');

    const rawShelf = req.body?.shelf_index ?? req.body?.shelfIndex;
    const rawPosition = req.body?.position;
    const shelfIndex = rawShelf === undefined ? undefined : Number(rawShelf);
    const position = rawPosition === undefined ? undefined : Number(rawPosition);

    if (shelfIndex === undefined || position === undefined || isNaN(shelfIndex) || isNaN(position)) {
      throw new AppError(400, 'shelf_index (0..2) and position (>= 0) are required');
    }

    const result = await this.updateDeckShelfUseCase.execute({
      deckId,
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
    const deckId = parseBody(deckIdSchema, req.params.id ?? '');
    const result = await this.getStudySessionUseCase.execute(deckId, userId);
    res.status(200).json(result);
  }

  async saveSession(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    const deckId = parseBody(deckIdSchema, req.params.id ?? '');
    const body = parseBody(sessionBodySchema, req.body ?? {});
    const result = await this.saveStudySessionUseCase.execute({
      deckId,
      userId,
      currentIndex: body.currentIndex,
      results: body.results,
      flashcardsHash: body.flashcardsHash ?? body.flashcards_hash ?? null,
      finished: body.finished,
    });
    res.status(200).json(result);
  }

  async deleteSession(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    const deckId = parseBody(deckIdSchema, req.params.id ?? '');
    // Explicit user action only. Finishing a session never deletes the row.
    await this.deleteStudySessionUseCase.execute(deckId, userId);
    res.status(204).send();
  }

  async previewPdfText(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    if (!req.file) {
      throw new AppError(400, 'PDF file is required');
    }
    const characters = await measurePdfCharacters(req.file);
    res.status(200).json({
      characters,
      cap: deckSourceTextCap(),
    });
  }

  async recordStudyProgress(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    const deckId = parseBody(deckIdSchema, req.params.id ?? '');
    const body = parseBody(studyProgressBodySchema, req.body ?? {});
    const result = await this.recordStudyProgressUseCase.execute(deckId, userId, body.isCorrect);
    res.status(200).json(result);
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
