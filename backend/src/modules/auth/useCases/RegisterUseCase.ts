import { IUserRepository } from '../domain/IUserRepository';
import { IPasswordHasherPort } from '../domain/IPasswordHasherPort';
import { ITokenServicePort } from '../domain/ITokenServicePort';
import { User } from '../domain/User';
import { AppError } from '../../../core/errors/AppError';

export class RegisterUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasherPort,
    private tokenService: ITokenServicePort
  ) {}

  async execute(email: string, passwordRaw: string) {
    if (!email || !passwordRaw) {
      throw new AppError(400, 'Email and password are required');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'User already exists');
    }

    const hashedPassword = await this.passwordHasher.hash(passwordRaw);

    const newUser: User = {
      id: '', // DB will generate it
      email,
      passwordHash: hashedPassword,
      provider: 'email',
      providerId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let savedUser: User;
    try {
      savedUser = await this.userRepository.save(newUser);
    } catch (error: any) {
      // Race condition: another request created the same email between the
      // findByEmail check above and this INSERT. Postgres unique violation is
      // code 23505 — map it to a real 409/Conflict, rethrow anything else.
      if (error?.code === '23505') {
        throw new AppError(409, 'User already exists');
      }
      throw error;
    }

    const token = this.tokenService.generateToken(
      { userId: savedUser.id, email: savedUser.email },
      '7d'
    );

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
      },
      token,
    };
  }
}