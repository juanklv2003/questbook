import apiClient from './axios';
import type { User } from '../types';

const STORAGE_KEY = 'questbook_oauth_code';

let inflightExchange: Promise<User | null> | null = null;
let exchangedUser: User | null = null;

/** Read oauth_code from URL (persist for StrictMode remounts) and clean the query string. */
export function takePendingOAuthCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('oauth_code');
  if (fromUrl) {
    sessionStorage.setItem(STORAGE_KEY, fromUrl);
    params.delete('oauth_code');
    const qs = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    );
  }
  const code = sessionStorage.getItem(STORAGE_KEY);
  return code;
}

export async function completeOAuthLogin(code: string): Promise<User | null> {
  if (exchangedUser) {
    return exchangedUser;
  }
  if (!inflightExchange) {
    inflightExchange = apiClient
      .post<{ user: User }>('/auth/oauth/exchange', { code })
      .then((res) => {
        exchangedUser = res.data?.user ?? null;
        sessionStorage.removeItem(STORAGE_KEY);
        return exchangedUser;
      })
      .catch((err) => {
        sessionStorage.removeItem(STORAGE_KEY);
        throw err;
      })
      .finally(() => {
        inflightExchange = null;
      });
  }
  return inflightExchange;
}
