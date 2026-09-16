import { getApiBaseUrl } from './apiBase';

/** Full navigation to backend Google OAuth start (must be top-level, not XHR). */
export function redirectToGoogleLogin(): void {
  window.location.href = `${getApiBaseUrl()}/auth/google`;
}
