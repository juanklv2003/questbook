/** Backend API base URL, always ending with `/api/v1`. */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  // Dev: relative URL → Vite proxy → backend :3000 (session + OAuth exchange on
  // :5173). Prod: VITE_API_URL must be the absolute API origin — the production
  // build fails in vite.config.ts when it is missing — and the same-origin
  // fallback is only a last resort so a deployed app never calls the visitor's
  // localhost (which used to break every request silently).
  let base = (raw && raw.length > 0 ? raw : '/api/v1').replace(/\/+$/, '');

  // En dev, llamar directo a :3000 rompe la sesión tras Google OAuth (cookie en otro origen).
  if (import.meta.env.DEV && /^https?:\/\/(localhost|127\.0\.0\.1):3000/i.test(base)) {
    base = '/api/v1';
  }

  if (base.endsWith('/api/v1')) {
    return base;
  }
  return `${base}/api/v1`;
}
