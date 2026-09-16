/** Backend API base URL, always ending with `/api/v1`. */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  // Dev default: relative URL → Vite proxy → backend :3000 (keeps session cookies on :5173).
  const fallback = import.meta.env.DEV ? '/api/v1' : 'http://localhost:3000/api/v1';
  const base = (raw && raw.length > 0 ? raw : fallback).replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) {
    return base;
  }
  return `${base}/api/v1`;
}
