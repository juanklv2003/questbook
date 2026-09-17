import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
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
// Headers de seguridad. La API sólo sirve JSON y redirects de OAuth, así que no
// definimos CSP (podría romper Turnstile/Google) y dejamos CORP en cross-origin
// porque el frontend vive en otro dominio (Vercel) y descarga PDFs de Cloudinary.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
// Orígenes permitidos: FRONTEND_URL + CORS_ORIGINS (ver config/env.ts). Sin
// header Origin (curl, health check de Render) pasa; un origen desconocido NO
// recibe headers CORS y el navegador lo bloquea.
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || env.CORS_ORIGINS.includes(origin));
    },
    credentials: true,
  })
);
app.use(compression());
// 1 MB alcanza para JSON/urlencoded de esta app (los PDFs van por multipart).
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
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
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    cors: {
      frontendUrl: env.FRONTEND_URL,
      allowedOrigins: env.CORS_ORIGINS,
    },
    auth: {
      googleOAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
    ai: {
      groqFallback: isGroqConfigured(),
      groqModel: isGroqConfigured() ? env.GROQ_MODEL : undefined,
      deckGeneration: 'groq-first-gemini-json-v3',
    },
    upload: {
      maxPdfBytes: env.MAX_PDF_UPLOAD_BYTES,
      maxPdfMb: env.MAX_PDF_UPLOAD_MB,
      cloudinaryMaxPdfBytes: env.CLOUDINARY_MAX_PDF_BYTES,
      cloudinaryMaxPdfMb: env.CLOUDINARY_MAX_PDF_MB,
      directUploadBaseUrl: env.API_PUBLIC_BASE_URL
        ? `${env.API_PUBLIC_BASE_URL}/decks/generate`
        : undefined,
    },
  });
});

// 404 explícito en JSON: sin esto Express respondía con HTML y el cliente
// intentaba leer `error` de un body que no era JSON.
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Global Error Handler
app.use(errorHandler);

export default app;
