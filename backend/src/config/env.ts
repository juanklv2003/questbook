import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  // Opcional: claves adicionales de Gemini separadas por comas para failover.
  // Ej.: GEMINI_API_KEYS=clave2,clave3
  GEMINI_API_KEYS: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
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
};
