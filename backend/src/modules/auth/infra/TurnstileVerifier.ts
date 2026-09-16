const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Verifica un token de Cloudflare Turnstile contra la API `siteverify`
 * (POST form-encoded con `secret` + `response` + `remoteip` opcional).
 *
 * Devuelve `true` solo si Cloudflare responde `success: true`. Cualquier
 * falla (token faltante/inválido/expirado, secreto mal configurado, error
 * de red o timeout) es `false`: el registro es fail-closed por diseño.
 */
export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIp?: string
): Promise<boolean> {
  if (!token || !secret) {
    return false;
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as TurnstileVerifyResponse;
    return data.success === true;
  } catch {
    return false;
  }
}
