import { Request, Response } from 'express';
import { z } from 'zod';
import { RegisterUseCase } from '../useCases/RegisterUseCase';
import { LoginUseCase } from '../useCases/LoginUseCase';
import { LogoutUseCase } from '../useCases/LogoutUseCase';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';
import { catchAsync } from '../../../core/middlewares/catchAsync';
import { AppError } from '../../../core/errors/AppError';
import { parseBody } from '../../../core/validation/parseBody';

// Email: se normaliza a minúsculas con trim antes de validar el formato, de
// modo que tanto el registro como el login comparen siempre el mismo valor
// (y no se permite crear duplicados "User@x" vs "user@x").
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Email inválido'));

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
  rememberMe: z.boolean().optional(),
});

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
    const body = parseBody(registerSchema, req.body ?? {});
    const result = await this.registerUseCase.execute(body.email, body.password);

    this.setCookie(res, result.token, 7); // expiración del JWT de registro (7d)
    res.status(201).json({ user: result.user });
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(loginSchema, req.body ?? {});
    const result = await this.loginUseCase.execute(body.email, body.password, body.rememberMe);

    // La cookie debe expirar junto con el JWT que emite LoginUseCase
    // (30d con "recordarme", 1d sin él) para no dejar una cookie viva
    // sin sesión válida detrás.
    this.setCookie(res, result.token, body.rememberMe ? 30 : 1);
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

  private setCookie(res: Response, token: string, maxAgeDays: number): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
