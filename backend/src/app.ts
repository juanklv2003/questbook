import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './core/middlewares/errorHandler';

const app = express();

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import { deckRouter } from './modules/decks/http/DeckRouter';
import { evaluationRouter } from './modules/evaluations/http/EvaluationRouter';
import { authRouter, authMiddleware } from './modules/auth/http/AuthRouter';

// Mount routers under /api/v1 here
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/decks', authMiddleware.requireAuth, deckRouter);
app.use('/api/v1/evaluations', authMiddleware.requireAuth, evaluationRouter);

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// CSP middleware to allow Chrome DevTools and other necessary requests
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:3000 ws://localhost:3000 chrome-extension:; frame-src 'self' https://accounts.google.com;"
  );
  next();
});

// Global Error Handler
app.use(errorHandler);

export default app;
