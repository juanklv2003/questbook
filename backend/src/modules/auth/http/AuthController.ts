import { Request, Response } from 'express';
import { z } from 'zod';
import { RegisterUseCase } from '../useCases/RegisterUseCase';
import { LoginUseCase } from '../useCases/LoginUseCase';
import { LogoutUseCase } from '../useCases/LogoutUseCase';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';
import { RequestPasswordResetUseCase } from '../useCases/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../useCases/ResetPasswordUseCase';
import { GoogleLoginUseCase } from '../useCases/GoogleLoginUseCase';
import { catchAsync } from '../../../core/middlewares/catchAsync';
import { AppError } from '../../../core/errors/AppError';
import { parseBody } from '../../../core/validation/parseBody';
import { verifyTurnstileToken } from '../infra/TurnstileVerifier';
import { env } from '../../../config/env';

// Email: se normaliza a minúsculas con trim antes de validar el formato, de
// modo que tanto el registro como el login comparen siempre el mismo valor
// (y no se permite crear duplicados "User@x" vs "user@x").
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Email inválido'));

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  // Token del widget de Cloudflare Turnstile (el login NO lo pide).
  turnstileToken: z.string().min(1, 'La verificación humana es obligatoria'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
  rememberMe: z.boolean().optional(),
});

// Paso 1 del "olvidé mi contraseña": pide el token de reseteo. Exige
// Turnstile igual que el registro (mismo secreto); el token es de un solo
// uso y expira, así que un reintento necesita verificación fresca.
const forgotPasswordSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().min(1, 'La verificación humana es obligatoria'),
});

// Paso 2: confirma con el token en claro (en DB solo vive su SHA-256).
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private logoutUseCase: LogoutUseCase,
    private getCurrentUserUseCase: GetCurrentUserUseCase,
    private requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private googleLoginUseCase: GoogleLoginUseCase
  ) {
    // Any thrown error goes to the global errorHandler, which maps AppError
    // (400/401/409/404/503...) to the right status code. DB/IA failures become
    // 500 instead of being hidden as "400 invalid input" or "401 wrong
    // credentials" like the previous try/catch did.
    this.register = catchAsync(this.register.bind(this));
    this.login = catchAsync(this.login.bind(this));
    this.logout = catchAsync(this.logout.bind(this));
    this.me = catchAsync(this.me.bind(this));
    this.forgotPassword = catchAsync(this.forgotPassword.bind(this));
    this.resetPassword = catchAsync(this.resetPassword.bind(this));
    this.googleLogin = catchAsync(this.googleLogin.bind(this));
    this.googleCallback = catchAsync(this.googleCallback.bind(this));
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(registerSchema, req.body ?? {});
    // Verificación humana ANTES de crear el usuario: los tokens son de un
    // solo uso y expiran, así que un reintento necesita un token fresco.
    const human = await verifyTurnstileToken(body.turnstileToken, env.TURNSTILE_SECRET_KEY, req.ip);
    if (!human) {
      throw new AppError(400, 'La verificación humana falló o expiró, intentá de nuevo');
    }
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
      secure: env.NODE_ENV === 'production',
      sameSite: env.COOKIE_SAME_SITE,
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

  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(forgotPasswordSchema, req.body ?? {});
    const human = await verifyTurnstileToken(body.turnstileToken, env.TURNSTILE_SECRET_KEY, req.ip);
    if (!human) {
      throw new AppError(400, 'La verificación humana falló o expiró, intentá de nuevo');
    }
    // 404 si el email no existe (enumeración aceptada en esta versión).
    const result = await this.requestPasswordResetUseCase.execute(body.email);
    res.status(200).json(result);
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(resetPasswordSchema, req.body ?? {});
    const result = await this.resetPasswordUseCase.execute(body.token, body.newPassword);
    res.status(200).json(result);
  };

  // Google OAuth login initiation
  public googleLogin = async (req: Request, res: Response): Promise<void> => {
    const googleClientId = env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      throw new AppError(500, 'Google OAuth not configured');
    }
    const redirectUri = env.GOOGLE_CALLBACK_URL ?? `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;
    const scope = ['profile', 'email'].map(s => s).join(' ');
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    res.redirect(authUrl.toString());
  };

  // Google OAuth callback
  public googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const code = req.query.code as string | undefined;
      if (!code) {
        throw new AppError(400, 'Missing code parameter');
      }

      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new AppError(500, 'Google OAuth not configured');
      }

      const redirectUri = env.GOOGLE_CALLBACK_URL ?? `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new AppError(400, `Failed to exchange code for tokens: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token as string;
      if (!accessToken) {
        throw new AppError(400, 'No access token in response');
      }

      // Fetch user profile
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        throw new AppError(400, `Failed to fetch user info: ${errorText}`);
      }

      const googleUser = await userResponse.json();
      const { id: googleId, email, name, picture } = googleUser;

      // Use Google login use case to find or create user and generate JWT
      const result = await this.googleLoginUseCase.execute(googleId, email, name, picture);

      // Set cookie and redirect to frontend
      const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:5173';
      this.setCookie(res, result.token, 7); // same expiration as register (7d)
      res.redirect(frontendUrl);
    } catch (error) {
      // On error, redirect to frontend with error message
      const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:5173';
      const errorMessage = error instanceof AppError ? error.message : 'Internal server error';
      const url = new URL(frontendUrl);
      url.searchParams.set('error', errorMessage);
      res.redirect(url.toString());
    }
  };

  private setCookie(res: Response, token: string, maxAgeDays: number): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      // `secure` es obligatorio con SameSite=None: sobre HTTP el navegador
      // descarta la cookie. Render/Railway/Vercel sirven HTTPS siempre.
      secure: env.NODE_ENV === 'production',
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}