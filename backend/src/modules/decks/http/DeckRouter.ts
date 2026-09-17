import { Router } from 'express';
import multer from 'multer';
import { GenerateDeckUseCase } from '../useCases/GenerateDeckUseCase';
import { GetDeckFlashcardsUseCase } from '../useCases/GetDeckFlashcardsUseCase';
import { ListDecksUseCase } from '../useCases/ListDecksUseCase';
import { DeleteDeckUseCase } from '../useCases/DeleteDeckUseCase';
import { UpdateDeckShelfUseCase } from '../useCases/UpdateDeckShelfUseCase';
import { GetStudySessionUseCase } from '../useCases/GetStudySessionUseCase';
import { SaveStudySessionUseCase } from '../useCases/SaveStudySessionUseCase';
import { DeleteStudySessionUseCase } from '../useCases/DeleteStudySessionUseCase';
import { PostgresStudySessionRepository } from '../infra/PostgresStudySessionRepository';
import { PostgresDeckRepository } from '../infra/PostgresDeckRepository';
import { GeminiFlashcardGenerator } from '../infra/GeminiFlashcardGenerator';
import { PostgresFlashcardRepository } from '../../flashcards/infra/PostgresFlashcardRepository';
import { CloudinaryStorageAdapter } from '../infra/CloudinaryStorageAdapter';
import { DeckController } from './DeckController';
import { db } from '../../../config/db';
import { env } from '../../../config/env';
import { aiGenerateLimiter } from '../../../core/middlewares/rateLimits';
import { JwtTokenService } from '../../auth/infra/JwtTokenService';

// PDF en memoria (multer). Tamaño: MAX_PDF_UPLOAD_MB en .env (default 100 MB).
// `limits` acota también la cantidad de archivos/campos aceptados: un solo
// archivo y los ~7 campos de texto que manda el frontend. El contenido se valida
// como PDF real en el controller antes de gastar IA o Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_PDF_UPLOAD_BYTES,
    files: 1,
    fields: 12,
    parts: 24,
  },
});

// 1. Instantiate Adapters
const deckRepo = new PostgresDeckRepository(db);
const flashcardRepo = new PostgresFlashcardRepository(db);
const aiGenerator = new GeminiFlashcardGenerator();
const cloudStorage = new CloudinaryStorageAdapter();
const tokenService = new JwtTokenService(env.JWT_SECRET);

// 2. Inject into Use Cases
const generateDeckUseCase = new GenerateDeckUseCase(deckRepo, aiGenerator, flashcardRepo, cloudStorage);
const getDeckFlashcardsUseCase = new GetDeckFlashcardsUseCase(flashcardRepo, deckRepo);
const listDecksUseCase = new ListDecksUseCase(deckRepo);
const deleteDeckUseCase = new DeleteDeckUseCase(deckRepo, cloudStorage);
const updateDeckShelfUseCase = new UpdateDeckShelfUseCase(deckRepo);
const sessionRepo = new PostgresStudySessionRepository(db);
const getStudySessionUseCase = new GetStudySessionUseCase(deckRepo, sessionRepo);
const saveStudySessionUseCase = new SaveStudySessionUseCase(deckRepo, sessionRepo);
const deleteStudySessionUseCase = new DeleteStudySessionUseCase(deckRepo, sessionRepo);

// 3. Inject into Controller
const deckController = new DeckController(
  generateDeckUseCase,
  getDeckFlashcardsUseCase,
  listDecksUseCase,
  deleteDeckUseCase,
  updateDeckShelfUseCase,
  getStudySessionUseCase,
  saveStudySessionUseCase,
  deleteStudySessionUseCase,
  cloudStorage,
  tokenService
);

// 4. Wire Router
const deckRouter = Router();

// Auth: app.ts mounts requireAuth on /api/v1/decks (do not duplicate per route).
deckRouter.post('/generate/pdf-upload-params', deckController.getPdfUploadParams);
deckRouter.post('/generate/direct-upload-token', deckController.createDirectUploadToken);
deckRouter.post('/generate', aiGenerateLimiter, upload.single('file'), deckController.generate);
deckRouter.get('/:deckId/flashcards', deckController.getFlashcards);
deckRouter.get('/', deckController.listDecks);
deckRouter.patch('/:id/shelf', deckController.updateShelf);
deckRouter.get('/:id/session', deckController.getSession);
deckRouter.patch('/:id/session', deckController.saveSession);
deckRouter.delete('/:id/session', deckController.deleteSession);
deckRouter.delete('/:id', deckController.deleteDeck);

export { deckRouter };
