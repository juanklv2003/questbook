/** Backend API base URL, always ending with `/api/v1`. */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  // Dev default: relative URL → Vite proxy → backend :3000 (session + OAuth exchange on :5173).
  const fallback = import.meta.env.DEV ? '/api/v1' : 'http://localhost:3000/api/v1';
  let base = (raw && raw.length > 0 ? raw : fallback).replace(/\/+$/, '');

  // En dev, llamar directo a :3000 rompe la sesión tras Google OAuth (cookie en otro origen).
  if (import.meta.env.DEV && /^https?:\/\/(localhost|127\.0\.0\.1):3000/i.test(base)) {
    base = '/api/v1';
  }

  if (base.endsWith('/api/v1')) {
    return base;
  }
  return `${base}/api/v1`;
}
