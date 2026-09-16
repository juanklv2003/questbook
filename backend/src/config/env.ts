import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  // Opcional: claves adicionales de Gemini separadas por comas para failover.
  // Ej.: GEMINI_API_KEYS=clave2,clave3
  GEMINI_API_KEYS: z.string().optional(),
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
    // Normaliza para que CORS no falle por un detalle de tipeo: quita espacios
    // y barras finales (el navegador compara el origen SIN barra, así que
    // "https://x.app/" nunca coincide con "https://x.app") y cae al localhost
    // de desarrollo si queda vacío.
    .transform((value) => {
      const normalized = (value ?? '').trim().replace(/\/+$/, '');
      return normalized || 'http://localhost:5173';
    }),
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
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = {
  ..._env.data,
  /**
   * Lista de API keys de Gemini para failover.
   * La primera es siempre GEMINI_API_KEY; las adicionales vienen de
   * GEMINI_API_KEYS (separadas por comas). Se deduplican por si se repiten.
   */
  GEMINI_API_KEYS: [
    ...new Set([
      _env.data.GEMINI_API_KEY,
      ...(_env.data.GEMINI_API_KEYS || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    ]),
  ],
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
};