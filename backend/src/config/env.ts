import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  // Opcional: claves adicionales de Gemini separadas por comas para failover.
  // Ej.: GEMINI_API_KEYS=clave2,clave3
  GEMINI_API_KEYS: z.string().optional(),
  // Opcional: clave de otra cuenta/proyecto Google (segundo cupo diario).
  // Se usa al final, cuando GEMINI_API_KEY + GEMINI_API_KEYS agotan cuota (429).
  GEMINI_API_KEY2: z.string().optional(),
  // Opcional: respaldo Groq cuando Gemini agota cuota (https://console.groq.com/keys)
  GROQ_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  GROQ_MODEL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  // Máximo de caracteres del PDF enviados a la IA al generar tarjetas (default 500_000).
  PDF_MAX_TEXT_CHARS: z.string().optional(),
  // Timeout (ms) de la llamada IA al generar un mazo desde PDF (default 120_000).
  AI_DECK_TIMEOUT_MS: z.string().optional(),
  /** Wall-clock budget (ms) for all AI batches in one deck generation (default 300_000). */
  AI_DECK_TOTAL_TIMEOUT_MS: z.string().optional(),
  // Tamaño máximo del PDF subido (MB). Default 100. Multer guarda el archivo en RAM.
  MAX_PDF_UPLOAD_MB: z.string().optional(),
  DB_POOL_MAX: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  // Secreto de Cloudflare Turnstile para verificar el registro humano.
  // Se consigue en https://dash.cloudflare.com/?to=/:account/turnstile
  // El endpoint POST /auth/register lo exige: sin secret válido el backend
  // no arranca (falla ruidosamente en vez de registrar sin verificación).
  TURNSTILE_SECRET_KEY: z.string().min(1, 'TURNSTILE_SECRET_KEY is required'),
  // Credenciales de Google OAuth (trim evita redirect_uri_mismatch por espacios en .env)
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  GOOGLE_CALLBACK_URL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().replace(/\/+$/, '') : undefined)),
  FRONTEND_URL: z
    .string()
    .optional()
    // Normaliza trim + sin barra final. El default localhost sólo se aplica en dev
    // (ver resolveFrontendUrl abajo); en producción vacío rompe CORS silenciosamente.
    .transform((value) => {
      const normalized = (value ?? '').trim().replace(/\/+$/, '');
      return normalized.length > 0 ? normalized : undefined;
    }),
  // Orígenes extra permitidos por CORS, separados por comas. Útil para los
  // preview deployments de Vercel (https://mi-app-git-rama-usuario.vercel.app)
  // o un dominio propio además del principal. FRONTEND_URL siempre se incluye.
  CORS_ORIGINS: z.string().optional(),
  // SameSite de la cookie de sesión. Si no se define (o queda vacío): 'none' en
  // producción (frontend y backend en dominios distintos, ej. Vercel + Render) y
  // 'lax' en desarrollo (localhost). 'none' exige HTTPS (ver docs/DEPLOYMENT.md).
  COOKIE_SAME_SITE: z
    .string()
    .optional()
    // Un valor vacío (plantilla copiada tal cual) se trata como "sin definir";
    // un valor inválido sí falla ruidosamente al arrancar.
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .pipe(z.enum(['lax', 'strict', 'none']).optional()),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  /** Signed upload preset for browser PDF uploads (Settings → Upload → Add preset, Signing: Signed). */
  CLOUDINARY_PDF_UPLOAD_PRESET: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  /** Cloudinary upload API limit per file (MB). Free tier is typically 10 MB. */
  CLOUDINARY_MAX_PDF_MB: z.string().optional(),
  /** Public API base for large PDF uploads (browser → Render, bypasses Vercel body limit). */
  API_PUBLIC_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().replace(/\/+$/, '') : undefined)),
  /** `legacy` = fixed folder mode (`folder` param). Default = dynamic folders (`asset_folder`). */
  CLOUDINARY_UPLOAD_FOLDER_MODE: z
    .string()
    .optional()
    .transform((v) => (v?.trim().toLowerCase() === 'legacy' ? 'legacy' : 'dynamic')),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

function resolveFrontendUrl(
  nodeEnv: 'development' | 'test' | 'production',
  configured: string | undefined
): string {
  if (nodeEnv === 'production') {
    if (!configured) {
      console.error(
        '❌ FRONTEND_URL is required in production (HTTPS URL of Vercel, no trailing slash). ' +
          'Without it CORS blocks login from the real frontend.'
      );
      process.exit(1);
    }
    if (/^http:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
      console.error('❌ FRONTEND_URL cannot be localhost in production.');
      process.exit(1);
    }
    return configured;
  }
  return configured ?? 'http://localhost:5173';
}

const FRONTEND_URL = resolveFrontendUrl(_env.data.NODE_ENV, _env.data.FRONTEND_URL);

export const env = {
  ..._env.data,
  FRONTEND_URL,
  /**
   * Lista ordenada de API keys de Gemini para failover (429 / cuota).
   * 1) GEMINI_API_KEY + GEMINI_API_KEYS (misma cuenta, deduplicadas)
   * 2) GEMINI_API_KEY2 al final (otra cuenta/proyecto, si está definida)
   */
  GEMINI_API_KEYS: (() => {
    const sameAccount = [
      ...new Set([
        _env.data.GEMINI_API_KEY,
        ...(_env.data.GEMINI_API_KEYS || '')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      ]),
    ];
    const secondAccount = _env.data.GEMINI_API_KEY2?.trim();
    if (!secondAccount || sameAccount.includes(secondAccount)) {
      return sameAccount;
    }
    return [...sameAccount, secondAccount];
  })(),
  /**
   * SameSite efectivo de la cookie `auth_token`.
   *
   * Con frontend y backend en dominios distintos (Vercel + Render/Railway) el
   * navegador NO envía una cookie `strict`/`lax` en las peticiones XHR y el
   * login parecería funcionar pero `/auth/me` devolvería 401. Por eso el
   * default en producción es `none` (requiere `secure`, o sea HTTPS).
   * Con mismo dominio/subdominios alcanza con `lax` (override explícito).
   */
  COOKIE_SAME_SITE:
    _env.data.COOKIE_SAME_SITE ??
    (_env.data.NODE_ENV === 'production' ? 'none' : 'lax'),
  /**
   * Orígenes permitidos por CORS: siempre FRONTEND_URL (el origen canónico, que
   * también es el destino del redirect de OAuth) + los de CORS_ORIGINS.
   * Normalizamos igual que FRONTEND_URL (trim + sin barra final) porque el
   * navegador compara el origen sin barra.
   */
  CORS_ORIGINS: (() => {
    const extra = (_env.data.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    return [...new Set([FRONTEND_URL, ...extra])];
  })(),
  /** Modelo Groq para fallback (OpenAI-compatible chat/completions). */
  GROQ_MODEL: _env.data.GROQ_MODEL ?? 'qwen/qwen3.6-27b',
  /** Caracteres máximos del texto del PDF incluidos en el prompt de generación. */
  PDF_MAX_TEXT_CHARS: clampInt(_env.data.PDF_MAX_TEXT_CHARS, 500_000, 5_000, 500_000),
  /** Tiempo máximo de espera (ms) al generar tarjetas desde un PDF. */
  AI_DECK_TIMEOUT_MS: clampInt(_env.data.AI_DECK_TIMEOUT_MS, 120_000, 15_000, 300_000),
  /** Tiempo máximo total (ms) para todas las tandas IA de un mismo mazo. */
  AI_DECK_TOTAL_TIMEOUT_MS: clampInt(_env.data.AI_DECK_TOTAL_TIMEOUT_MS, 480_000, 60_000, 600_000),
  /** Límite de subida PDF (bytes), configurable vía MAX_PDF_UPLOAD_MB (default 100). */
  MAX_PDF_UPLOAD_MB: clampInt(_env.data.MAX_PDF_UPLOAD_MB, 100, 1, 100),
  MAX_PDF_UPLOAD_BYTES: clampInt(_env.data.MAX_PDF_UPLOAD_MB, 100, 1, 100) * 1024 * 1024,
  /** Per-file limit on Cloudinary's upload API (free tier ≈ 10 MB). */
  CLOUDINARY_MAX_PDF_MB: clampInt(_env.data.CLOUDINARY_MAX_PDF_MB, 10, 1, 100),
  CLOUDINARY_MAX_PDF_BYTES: clampInt(_env.data.CLOUDINARY_MAX_PDF_MB, 10, 1, 100) * 1024 * 1024,
  /** Base URL for browser → API multipart (must match Render/Railway public URL). */
  API_PUBLIC_BASE_URL:
    _env.data.API_PUBLIC_BASE_URL ??
    (_env.data.NODE_ENV === 'production'
      ? 'https://flashcards-ia-api.onrender.com/api/v1'
      : `http://localhost:${_env.data.PORT}/api/v1`),
  DB_POOL_MAX: clampInt(_env.data.DB_POOL_MAX, 10, 1, 30),
};

function clampInt(
  raw: string | undefined,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (raw === undefined || raw.trim() === '') return defaultValue;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, n));
}