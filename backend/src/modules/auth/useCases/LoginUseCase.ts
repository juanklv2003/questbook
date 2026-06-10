import { IUserRepository } from '../domain/IUserRepository';
import { IPasswordHasherPort } from '../domain/IPasswordHasherPort';
import { ITokenServicePort } from '../domain/ITokenServicePort';

export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasherPort,
    private tokenService: ITokenServicePort
  ) {}

  async execute(email: string, passwordRaw: string, rememberMe: boolean = false) {
    if (!email || !passwordRaw) {
      throw new Error('Email and password are required');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await this.passwordHasher.compare(passwordRaw, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const expiresIn = rememberMe ? '30d' : '1d';
    const token = this.tokenService.generateToken(
      { userId: user.id, email: user.email },
      expiresIn
    );

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    };
  }
}
