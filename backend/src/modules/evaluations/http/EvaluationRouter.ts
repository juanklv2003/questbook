import { Router } from 'express';
import { EvaluateAnswerUseCase } from '../useCases/EvaluateAnswerUseCase';
import { GeminiEvaluator } from '../infra/GeminiEvaluator';
import { PostgresFlashcardRepository } from '../../flashcards/infra/PostgresFlashcardRepository';
import { PostgresDeckRepository } from '../../decks/infra/PostgresDeckRepository';
import { EvaluationController } from './EvaluationController';
import { db } from '../../../config/db';
import { aiEvaluateLimiter } from '../../../core/middlewares/rateLimits';

const evaluator = new GeminiEvaluator();
const flashcardRepo = new PostgresFlashcardRepository(db);
const deckRepo = new PostgresDeckRepository(db);

const evaluateAnswerUseCase = new EvaluateAnswerUseCase(evaluator, flashcardRepo, deckRepo);
const evaluationController = new EvaluationController(evaluateAnswerUseCase);

const evaluationRouter = Router();

evaluationRouter.post('/evaluate', aiEvaluateLimiter, evaluationController.evaluate);

export { evaluationRouter };
