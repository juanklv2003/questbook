import * as crypto from 'crypto';
import { IUserRepository } from '../domain/IUserRepository';
import { IPasswordResetRepository } from '../domain/IPasswordResetRepository';
import { AppError } from '../../../core/errors/AppError';

export const PASSWORD_RESET_TTL_MINUTES = 15;

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class RequestPasswordResetUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordResetRepository: IPasswordResetRepository
  ) {}

  async execute(email: string) {
    if (!email) {
      throw new AppError(400, 'Email is required');
    }

    // Enumeración aceptada en esta versión: 404 explícito si no existe.
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'No existe una cuenta con ese correo electrónico');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    await this.passwordResetRepository.create(user.id, tokenHash, expiresAt);

    // Sin SMTP en el proyecto: el token vuelve en la respuesta y el
    // frontend muestra directamente el form de nueva contraseña.
    return { resetToken, expiresAt: expiresAt.toISOString() };
  }
}
