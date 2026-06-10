import { Router } from 'express';
import { EvaluateAnswerUseCase } from '../useCases/EvaluateAnswerUseCase';
import { GeminiEvaluator } from '../infra/GeminiEvaluator';
import { PostgresFlashcardRepository } from '../../flashcards/infra/PostgresFlashcardRepository';
import { EvaluationController } from './EvaluationController';
import { db } from '../../../config/db';

const evaluator = new GeminiEvaluator();
const flashcardRepo = new PostgresFlashcardRepository(db);

const evaluateAnswerUseCase = new EvaluateAnswerUseCase(evaluator, flashcardRepo);
const evaluationController = new EvaluationController(evaluateAnswerUseCase);

const evaluationRouter = Router();

evaluationRouter.post('/evaluate', evaluationController.evaluate);

export { evaluationRouter };
