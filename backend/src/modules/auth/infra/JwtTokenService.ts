import * as jwt from 'jsonwebtoken';
import { ITokenServicePort, TokenPayload } from '../domain/ITokenServicePort';

export class JwtTokenService implements ITokenServicePort {
  private readonly secret: string;

  constructor(secret: string) {
    if (!secret) {
      throw new Error('JWT secret is required');
    }
    this.secret = secret;
  }

  generateToken(payload: TokenPayload, expiresIn: string): string {
    return jwt.sign(payload, this.secret, { expiresIn: expiresIn as any });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
