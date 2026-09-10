import { IEvaluatorPort } from '../domain/IEvaluatorPort';
import { IFlashcardRepository } from '../../flashcards/domain/IFlashcardRepository';
import { IDeckRepository } from '../../decks/domain/IDeckRepository';
import { AppError } from '../../../core/errors/AppError';

interface EvaluateAnswerDTO {
  flashcardId: string;
  userAnswer: string;
  /** Usuario autenticado (req.user.userId). Se verifica ownership del deck. */
  userId: string;
}

export class EvaluateAnswerUseCase {
  constructor(
    private readonly evaluator: IEvaluatorPort,
    private readonly flashcardRepo: IFlashcardRepository,
    private readonly deckRepo: IDeckRepository
  ) {}

  async execute(dto: EvaluateAnswerDTO) {
    const flashcard = await this.flashcardRepo.findById(dto.flashcardId);
    if (!flashcard) {
      throw new AppError(404, 'Flashcard not found');
    }

    // Ownership: solo el dueño del deck puede evaluar sus tarjetas.
    const deck = await this.deckRepo.findById(flashcard.deckId);
    if (!deck) {
      throw new AppError(404, 'Deck not found');
    }
    if (deck.userId !== dto.userId) {
      throw new AppError(403, 'No tienes permiso para evaluar esta tarjeta');
    }

    const raw = await this.evaluator.evaluate(
      flashcard.question,
      flashcard.answer,
      dto.userAnswer
    );

    // La corrección final SIEMPRE se decide en el servidor: el score es el único
    // dato de confianza; el booleano del modelo se re-deriva (score >= 70).
    const result = normalizeEvaluation(raw);

    // Progreso acumulado por deck (estudiadas+1, correctas+0/1).
    const { progressPercent } = await this.deckRepo.recordEvaluation(
      flashcard.deckId,
      result.isCorrect
    );

    return { ...result, deckId: flashcard.deckId, deckProgress: progressPercent };
  }
}

/**
 * Sanitiza la evaluación devuelta por el LLM:
 * - `score`: entero acotado a [0, 100] (tolera strings y NaN).
 * - `isCorrect`: SIEMPRE derivado del score (>= 70), nunca del booleano del modelo.
 * - `feedback`: string no vacío garantizado.
 */
export function normalizeEvaluation(raw: { score?: unknown; isCorrect?: unknown; feedback?: unknown }): {
  score: number;
  isCorrect: boolean;
  feedback: string;
} {
  const parsedScore = Number(raw?.score);
  const score = Number.isFinite(parsedScore)
    ? Math.round(Math.min(100, Math.max(0, parsedScore)))
    : 0;
  const isCorrect = score >= 70;
  const feedback =
    typeof raw?.feedback === 'string' && raw.feedback.trim()
      ? raw.feedback.trim()
      : 'Sin comentarios adicionales.';
  return { score, isCorrect, feedback };
}
