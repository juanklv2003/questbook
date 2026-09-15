import { Request, Response } from 'express';
import { RegisterUseCase } from '../useCases/RegisterUseCase';
import { LoginUseCase } from '../useCases/LoginUseCase';
import { LogoutUseCase } from '../useCases/LogoutUseCase';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';
import { catchAsync } from '../../../core/middlewares/catchAsync';
import { AppError } from '../../../core/errors/AppError';

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private logoutUseCase: LogoutUseCase,
    private getCurrentUserUseCase: GetCurrentUserUseCase
  ) {
    // Any thrown error goes to the global errorHandler, which maps AppError
    // (400/401/409/404/503...) to the right status code. DB/IA failures become
    // 500 instead of being hidden as "400 invalid input" or "401 wrong
    // credentials" like the previous try/catch did.
    this.register = catchAsync(this.register.bind(this));
    this.login = catchAsync(this.login.bind(this));
    this.logout = catchAsync(this.logout.bind(this));
    this.me = catchAsync(this.me.bind(this));
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const result = await this.registerUseCase.execute(email, password);

    this.setCookie(res, result.token);
    res.status(201).json({ user: result.user });
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const { email, password, rememberMe } = req.body;
    const result = await this.loginUseCase.execute(email, password, rememberMe);

    this.setCookie(res, result.token);
    res.status(200).json({ user: result.user });
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    await this.logoutUseCase.execute();
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.status(200).json({ message: 'Logged out successfully' });
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await this.getCurrentUserUseCase.execute(userId);
    res.status(200).json({ user });
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
