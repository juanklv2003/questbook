import { Request, Response, NextFunction } from 'express';
import { ITokenServicePort } from '../domain/ITokenServicePort';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export class AuthMiddleware {
  constructor(private tokenService: ITokenServicePort) {}

  public requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    // 1. Try to get token from cookies
    let token = req.cookies?.auth_token;

    // 2. Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = this.tokenService.verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = payload;
    next();
  };
}
