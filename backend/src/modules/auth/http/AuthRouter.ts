import { Router } from 'express';
import { PostgresUserRepository } from '../infra/PostgresUserRepository';
import { BcryptPasswordHasher } from '../infra/BcryptPasswordHasher';
import { JwtTokenService } from '../infra/JwtTokenService';
import { RegisterUseCase } from '../useCases/RegisterUseCase';
import { LoginUseCase } from '../useCases/LoginUseCase';
import { LogoutUseCase } from '../useCases/LogoutUseCase';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';
import { AuthController } from './AuthController';
import { AuthMiddleware } from './AuthMiddleware';
import { env } from '../../../config/env';

const authRouter = Router();

// DI Setup
const userRepository = new PostgresUserRepository(env.DATABASE_URL);
const passwordHasher = new BcryptPasswordHasher();
// env.JWT_SECRET is validated as required by config/env.ts — never fall back
// to a hardcoded secret: a predictable JWT secret would let anyone forge tokens.
const tokenService = new JwtTokenService(env.JWT_SECRET);

const registerUseCase = new RegisterUseCase(userRepository, passwordHasher, tokenService);
const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
const logoutUseCase = new LogoutUseCase();
const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

const authController = new AuthController(
  registerUseCase,
  loginUseCase,
  logoutUseCase,
  getCurrentUserUseCase
);

const authMiddleware = new AuthMiddleware(tokenService);

// Routes
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', authMiddleware.requireAuth, authController.logout);
authRouter.get('/me', authMiddleware.requireAuth, authController.me);

export { authRouter, authMiddleware };
