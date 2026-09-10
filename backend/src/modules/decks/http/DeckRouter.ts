import { Router } from 'express';
import multer from 'multer';
import { GenerateDeckUseCase } from '../useCases/GenerateDeckUseCase';
import { GetDeckFlashcardsUseCase } from '../useCases/GetDeckFlashcardsUseCase';
import { ListDecksUseCase } from '../useCases/ListDecksUseCase';
import { DeleteDeckUseCase } from '../useCases/DeleteDeckUseCase';
import { UpdateDeckShelfUseCase } from '../useCases/UpdateDeckShelfUseCase';
import { PostgresDeckRepository } from '../infra/PostgresDeckRepository';
import { GeminiFlashcardGenerator } from '../infra/GeminiFlashcardGenerator';
import { PostgresFlashcardRepository } from '../../flashcards/infra/PostgresFlashcardRepository';
import { CloudinaryStorageAdapter } from '../infra/CloudinaryStorageAdapter';
import { DeckController } from './DeckController';
import { db } from '../../../config/db';
import { authMiddleware } from '../../auth/http/AuthRouter';

// Límite de subida: suficiente para PDFs de estudio típicos y evita cargar
// buffers enormes en memoria. Multer responde LIMIT_FILE_SIZE al excederlo.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

// 1. Instantiate Adapters
const deckRepo = new PostgresDeckRepository(db);
const flashcardRepo = new PostgresFlashcardRepository(db);
const aiGenerator = new GeminiFlashcardGenerator();
const cloudStorage = new CloudinaryStorageAdapter();

// 2. Inject into Use Cases
const generateDeckUseCase = new GenerateDeckUseCase(deckRepo, aiGenerator, flashcardRepo, cloudStorage);
const getDeckFlashcardsUseCase = new GetDeckFlashcardsUseCase(flashcardRepo, deckRepo);
const listDecksUseCase = new ListDecksUseCase(deckRepo);
const deleteDeckUseCase = new DeleteDeckUseCase(deckRepo, cloudStorage);
const updateDeckShelfUseCase = new UpdateDeckShelfUseCase(deckRepo);

// 3. Inject into Controller
const deckController = new DeckController(
  generateDeckUseCase,
  getDeckFlashcardsUseCase,
  listDecksUseCase,
  deleteDeckUseCase,
  updateDeckShelfUseCase
);

// 4. Wire Router
const deckRouter = Router();

deckRouter.post('/generate', authMiddleware.requireAuth, upload.single('file'), deckController.generate);
deckRouter.get('/:deckId/flashcards', authMiddleware.requireAuth, deckController.getFlashcards);
deckRouter.get('/', authMiddleware.requireAuth, deckController.listDecks);
deckRouter.patch('/:id/shelf', authMiddleware.requireAuth, deckController.updateShelf);
deckRouter.delete('/:id', authMiddleware.requireAuth, deckController.deleteDeck);

export { deckRouter };
