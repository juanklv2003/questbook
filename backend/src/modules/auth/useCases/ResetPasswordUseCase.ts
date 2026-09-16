import { IUserRepository } from '../domain/IUserRepository';
import { IPasswordResetRepository } from '../domain/IPasswordResetRepository';
import { IPasswordHasherPort } from '../domain/IPasswordHasherPort';
import { AppError } from '../../../core/errors/AppError';
import { hashResetToken } from './RequestPasswordResetUseCase';

export class ResetPasswordUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordResetRepository: IPasswordResetRepository,
    private passwordHasher: IPasswordHasherPort
  ) {}

  async execute(token: string, newPasswordRaw: string) {
    if (!token || !newPasswordRaw) {
      throw new AppError(400, 'Token and new password are required');
    }

    // Mensaje genérico a propósito: no distingue entre token inexistente,
    // ya usado o expirado para no filtrar estado interno.
    const invalidTokenError = () => new AppError(400, 'El enlace es inválido o expiró, pedí uno nuevo');

    const tokenHash = hashResetToken(token);
    const stored = await this.passwordResetRepository.findByTokenHash(tokenHash);
    if (!stored || stored.usedAt) {
      throw invalidTokenError();
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw invalidTokenError();
    }

    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw invalidTokenError();
    }

    const hashedPassword = await this.passwordHasher.hash(newPasswordRaw);
    await this.userRepository.save({ ...user, passwordHash: hashedPassword, updatedAt: new Date() });
    await this.passwordResetRepository.markAsUsed(stored.id);

    return { message: 'Password reset successfully' };
  }
}
