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

    const result = normalizeEvaluation(raw);

    // Progreso acumulado por deck (estudiadas+1, correctas+0/1).
    const { progressPercent } = await this.deckRepo.recordEvaluation(
      flashcard.deckId,
      result.isCorrect
    );

    return { ...result, deckId: flashcard.deckId, deckProgress: progressPercent };
  }
}

function parseBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'sí' || s === 'si') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return false;
}

/**
 * Sanitiza la evaluación devuelta por el LLM:
 * - `isCorrect`: booleano normalizado en el servidor.
 * - `feedback`: string no vacío garantizado.
 */
export function normalizeEvaluation(raw: { isCorrect?: unknown; feedback?: unknown }): {
  isCorrect: boolean;
  feedback: string;
} {
  const isCorrect = parseBoolean(raw?.isCorrect);
  const feedback =
    typeof raw?.feedback === 'string' && raw.feedback.trim()
      ? raw.feedback.trim()
      : 'Sin comentarios adicionales.';
  return { isCorrect, feedback };
}
