import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env';
import { isGroqConfigured } from './core/ai/GroqClient';
import { errorHandler } from './core/middlewares/errorHandler';

const app = express();

// Chrome DevTools probes this path; without a handler Express 404 noise appears in the console.
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.type('application/json').send('{}');
});

// Legacy paths (wrong docs / old VITE_API_URL without /api/v1 prefix)
app.get('/auth/google', (_req, res) => {
  res.redirect(302, '/api/v1/auth/google');
});
app.get('/auth/google/callback', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(302, `/api/v1/auth/google/callback${query}`);
});

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(compression());
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

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    auth: {
      googleOAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
    ai: {
      groqFallback: isGroqConfigured(),
      groqModel: isGroqConfigured() ? env.GROQ_MODEL : undefined,
    },
    upload: {
      maxPdfBytes: env.MAX_PDF_UPLOAD_BYTES,
      maxPdfMb: env.MAX_PDF_UPLOAD_MB,
    },
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
