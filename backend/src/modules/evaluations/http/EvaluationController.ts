import { Request, Response } from 'express';
import { EvaluateAnswerUseCase } from '../useCases/EvaluateAnswerUseCase';
import { catchAsync } from '../../../core/middlewares/catchAsync';
import { AppError } from '../../../core/errors/AppError';

export class EvaluationController {
  constructor(private readonly evaluateAnswerUseCase: EvaluateAnswerUseCase) {
    this.evaluate = catchAsync(this.evaluate.bind(this));
  }

  async evaluate(req: Request, res: Response) {
    const { flashcardId, userAnswer } = req.body;

    if (!flashcardId || !userAnswer) {
      throw new AppError(400, 'flashcardId and userAnswer are required');
    }

    const result = await this.evaluateAnswerUseCase.execute({
      flashcardId,
      userAnswer
    });

    res.status(200).json(result);
  }
}
