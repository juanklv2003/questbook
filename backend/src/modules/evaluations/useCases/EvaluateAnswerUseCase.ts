import { IEvaluatorPort } from '../domain/IEvaluatorPort';
import { IFlashcardRepository } from '../../flashcards/domain/IFlashcardRepository';
import { IDeckRepository } from '../../decks/domain/IDeckRepository';

interface EvaluateAnswerDTO {
  flashcardId: string;
  userAnswer: string;
}

export class EvaluateAnswerUseCase {
  constructor(
    private readonly evaluator: IEvaluatorPort,
    private readonly flashcardRepo: IFlashcardRepository, // Assuming we need to fetch the card first, wait we need to fetch by ID
    private readonly deckRepo: IDeckRepository
  ) {}

  // Actually we need findById in IFlashcardRepository. Let's assume we add it or just implement it.
  async execute(dto: EvaluateAnswerDTO) {
    // We need the flashcard's question and correct answer.
    // If the repo doesn't have findById, we'll need to add it.
    // For now, let's call a findById method.
    const flashcard = await this.flashcardRepo.findById(dto.flashcardId);
    if (!flashcard) {
      throw new Error('Flashcard not found'); // Should use AppError ideally
    }

    const result = await this.evaluator.evaluate(
      flashcard.question,
      flashcard.answer,
      dto.userAnswer
    );

    // Persist cumulative per-deck progress (atomic studied+1 / correct+?1:0).
    // Additive fields: deckId + deckProgress, existing clients keep working.
    const { progressPercent } = await this.deckRepo.recordEvaluation(
      flashcard.deckId,
      result.isCorrect
    );

    return { ...result, deckId: flashcard.deckId, deckProgress: progressPercent };
  }
}
