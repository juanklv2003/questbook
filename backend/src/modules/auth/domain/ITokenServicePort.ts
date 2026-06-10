export interface TokenPayload {
  userId: string;
  email: string;
}

export interface ITokenServicePort {
  generateToken(payload: TokenPayload, expiresIn: string): string;
  verifyToken(token: string): TokenPayload | null;
}
