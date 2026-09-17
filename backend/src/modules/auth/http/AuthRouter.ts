import { Router } from 'express';
import { PostgresUserRepository } from '../infra/PostgresUserRepository';
import { PostgresPasswordResetRepository } from '../infra/PostgresPasswordResetRepository';
import { BcryptPasswordHasher } from '../infra/BcryptPasswordHasher';
import { JwtTokenService } from '../infra/JwtTokenService';
import { RegisterUseCase } from '../useCases/RegisterUseCase';
import { LoginUseCase } from '../useCases/LoginUseCase';
import { LogoutUseCase } from '../useCases/LogoutUseCase';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';
import { RequestPasswordResetUseCase } from '../useCases/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../useCases/ResetPasswordUseCase';
import { GoogleLoginUseCase } from '../useCases/GoogleLoginUseCase';
import { AuthController } from './AuthController';
import { AuthMiddleware } from './AuthMiddleware';
import { env } from '../../../config/env';

const authRouter = Router();

// DI Setup
const userRepository = new PostgresUserRepository(env.DATABASE_URL);
const passwordResetRepository = new PostgresPasswordResetRepository(env.DATABASE_URL);
const passwordHasher = new BcryptPasswordHasher();
// env.JWT_SECRET is validated as required by config/env.ts — never fall back
// to a hardcoded secret: a predictable JWT secret would let anyone forge tokens.
const tokenService = new JwtTokenService(env.JWT_SECRET);

const registerUseCase = new RegisterUseCase(userRepository, passwordHasher, tokenService);
const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
const logoutUseCase = new LogoutUseCase();
const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);
const requestPasswordResetUseCase = new RequestPasswordResetUseCase(userRepository, passwordResetRepository);
const resetPasswordUseCase = new ResetPasswordUseCase(userRepository, passwordResetRepository, passwordHasher);
const googleLoginUseCase = new GoogleLoginUseCase(userRepository, tokenService);

const authController = new AuthController(
  registerUseCase,
  loginUseCase,
  logoutUseCase,
  getCurrentUserUseCase,
  requestPasswordResetUseCase,
  resetPasswordUseCase,
  googleLoginUseCase
);

import { authLimiter } from '../../../core/middlewares/rateLimits';

const authMiddleware = new AuthMiddleware(tokenService);

// Routes
authRouter.post('/register', authLimiter, authController.register);
authRouter.post('/login', authLimiter, authController.login);
authRouter.post('/logout', authMiddleware.requireAuth, authController.logout);
authRouter.get('/me', authMiddleware.requireAuth, authController.me);
authRouter.post('/forgot-password', authLimiter, authController.forgotPassword);
authRouter.post('/reset-password', authLimiter, authController.resetPassword);

// Google OAuth routes
authRouter.get('/google', authController.googleLogin);
authRouter.get('/google/callback', authController.googleCallback);
authRouter.post('/oauth/exchange', authController.exchangeOAuth);

export { authRouter, authMiddleware };