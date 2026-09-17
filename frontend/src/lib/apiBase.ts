/** Ensures path ends with `/api/v1`. */
function withApiV1Suffix(base: string): string {
  if (base.endsWith('/api/v1')) {
    return base;
  }
  return `${base}/api/v1`;
}

/** Backend API base URL, always ending with `/api/v1`. */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  // Dev: relative URL → Vite proxy → backend :3000 (session + OAuth on :5173).
  let base = (raw && raw.length > 0 ? raw : '/api/v1').replace(/\/+$/, '');

  if (import.meta.env.DEV && /^https?:\/\/(localhost|127\.0\.0\.1):3000/i.test(base)) {
    base = '/api/v1';
  }

  base = withApiV1Suffix(base);

  // En producción, si el build compiló una URL absoluta de Render/Railway pero la
  // app se sirve desde Vercel/Netlify, la cookie de sesión queda en el dominio
  // del frontend (p. ej. tras OAuth por el proxy). Las XHR a otro origen no llevan
  // esa cookie → login/Google “funcionan” pero /auth/me y /decks dan 401.
  if (typeof window !== 'undefined' && import.meta.env.PROD) {
    try {
      const apiOrigin = new URL(base, window.location.origin).origin;
      if (apiOrigin !== window.location.origin) {
        return '/api/v1';
      }
    } catch {
      // keep base
    }
  }

  return base;
}
