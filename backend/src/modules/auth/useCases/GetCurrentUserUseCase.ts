import { IUserRepository } from '../domain/IUserRepository';

export class GetCurrentUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}
