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

// Global Error Handler
app.use(errorHandler);

export default app;
