import { IUserRepository } from '../domain/IUserRepository';
import { AppError } from '../../../core/errors/AppError';

export class GetCurrentUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string) {
    if (!userId) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}
