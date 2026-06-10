import { IUserRepository } from '../domain/IUserRepository';
import { IPasswordHasherPort } from '../domain/IPasswordHasherPort';
import { ITokenServicePort } from '../domain/ITokenServicePort';
import { User } from '../domain/User';

export interface RegisterDTO {
  email: string;
  passwordHash: string; // The raw password is sent to the use case as "password", wait
}

export class RegisterUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasherPort,
    private tokenService: ITokenServicePort
  ) {}

  async execute(email: string, passwordRaw: string) {
    if (!email || !passwordRaw) {
      throw new Error('Email and password are required');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.passwordHasher.hash(passwordRaw);

    const newUser: User = {
      id: '', // DB will generate it
      email,
      passwordHash: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedUser = await this.userRepository.save(newUser);

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
