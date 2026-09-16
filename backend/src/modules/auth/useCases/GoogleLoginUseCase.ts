import { IUserRepository } from '../domain/IUserRepository';
import { ITokenServicePort } from '../domain/ITokenServicePort';
import { User } from '../domain/User';
import { AppError } from '../../../core/errors/AppError';

export class GoogleLoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private tokenService: ITokenServicePort
  ) {}

  async execute(googleId: string, email: string, name: string = '', picture: string = '') {
    if (!email) {
      throw new AppError(400, 'Email is required from Google profile');
    }

    // Normalize email to lowercase as we do elsewhere
    const normalizedEmail = email.toLowerCase().trim();

    // Try to find existing user by email
    let user = await this.userRepository.findByEmail(normalizedEmail);

    if (user) {
      // If user exists but provider is not google, we could link the google account.
      // For simplicity, we allow login regardless of provider (could be email).
      // However, if they previously signed up with email, we might want to keep provider as email.
      // We'll not change provider; just allow login.
      // Optionally, we could update providerId if missing.
      if (user.provider === 'google' && !user.providerId) {
        // Link google id
        user.providerId = googleId;
        await this.userRepository.save(user);
      }
    } else {
      // Create new user with google provider
      const newUser: User = {
        id: '', // DB will generate it
        email: normalizedEmail,
        passwordHash: '', // No password for google users
        provider: 'google',
        providerId: googleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      user = await this.userRepository.save(newUser);
    }

    // Generate JWT
    const token = this.tokenService.generateToken(
      { userId: user.id, email: user.email },
      '7d' // same expiration as register
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