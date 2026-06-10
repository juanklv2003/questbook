import { Request, Response } from 'express';
import { RegisterUseCase } from '../useCases/RegisterUseCase';
import { LoginUseCase } from '../useCases/LoginUseCase';
import { LogoutUseCase } from '../useCases/LogoutUseCase';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private logoutUseCase: LogoutUseCase,
    private getCurrentUserUseCase: GetCurrentUserUseCase
  ) {}

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.registerUseCase.execute(email, password);

      this.setCookie(res, result.token);
      res.status(201).json({ user: result.user });
    } catch (error: any) {
      if (error.message === 'User already exists') {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, rememberMe } = req.body;
      const result = await this.loginUseCase.execute(email, password, rememberMe);

      this.setCookie(res, result.token);
      res.status(200).json({ user: result.user });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.logoutUseCase.execute();
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await this.getCurrentUserUseCase.execute(userId);
      res.status(200).json({ user });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  private setCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
  }
}
