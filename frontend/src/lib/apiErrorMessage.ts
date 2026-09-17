import type { TranslationKey } from '../i18n/LanguageContext';
import { parseOverloaded, parseQuotaExceeded, parseRateLimited } from './quota';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export type ApiErrorContext =
  | 'authLogin'
  | 'authRegister'
  | 'authForgot'
  | 'authReset'
  | 'authOAuth'
  | 'authLogout'
  | 'deckLoad'
  | 'deckGenerate'
  | 'deckFlashcards'
  | 'eval'
  | 'deleteDeck'
  | 'generic';

type ErrorPayload = {
  status?: number;
  code?: string;
  serverMessage?: string;
};

function readPayload(err: unknown): ErrorPayload {
  if (!err || typeof err !== 'object') {
    return {};
  }
  const response = 'response' in err ? (err as { response?: unknown }).response : undefined;
  if (!response || typeof response !== 'object') {
    return {};
  }
  const status =
    'status' in response && typeof (response as { status?: unknown }).status === 'number'
      ? (response as { status: number }).status
      : undefined;
  const data = 'data' in response ? (response as { data?: unknown }).data : undefined;
  if (!data || typeof data !== 'object') {
    return { status };
  }
  const record = data as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code : undefined;
  const serverMessage = typeof record.error === 'string' ? record.error.trim() : undefined;
  return { status, code, serverMessage };
}

function isNetworkFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const code = 'code' in err ? (err as { code?: unknown }).code : undefined;
  if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || code === 'ERR_CONNECTION_REFUSED') {
    return true;
  }
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!message) return false;
  const lowered = message.toLowerCase();
  return (
    lowered.includes('network error') ||
    lowered.includes('network request failed') ||
    lowered.includes('failed to fetch')
  );
}

function isTimeout(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? (err as { code?: unknown }).code : undefined;
  if (code === 'ECONNABORTED') return true;
  const message = err instanceof Error ? err.message : '';
  return message.toLowerCase().includes('timeout');
}

function fallbackKey(context: ApiErrorContext): TranslationKey {
  switch (context) {
    case 'authLogin':
      return 'auth.loginError';
    case 'authRegister':
      return 'auth.registerError';
    case 'authForgot':
      return 'auth.forgotError';
    case 'authReset':
      return 'auth.resetError';
    case 'authOAuth':
      return 'auth.oauthFailed';
    case 'authLogout':
      return 'auth.logoutError';
    case 'deckLoad':
      return 'deck.loadError';
    case 'deckFlashcards':
      return 'deck.flashError';
    case 'deckGenerate':
      return 'gen.generic';
    case 'eval':
      return 'eval.generic';
    case 'deleteDeck':
      return 'delete.error';
    default:
      return 'errors.generic';
  }
}

function mapGenerate422(message: string | undefined, t: Translate): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (
    m.includes('extraer texto') ||
    m.includes('extract text') ||
    m.includes('imágenes escaneadas') ||
    m.includes('scanned')
  ) {
    return t('gen.pdfNoText');
  }
  if (m.includes('pdf válido') || m.includes('valid pdf') || m.includes('dañado') || m.includes('corrupted')) {
    return t('gen.pdfInvalid');
  }
  if (m.includes('extracción del pdf') || (m.includes('extract') && m.includes('tardó'))) {
    return t('gen.pdfExtractTimeout');
  }
  if (m.includes('descarga del pdf') || m.includes('no se pudo leer el pdf') || m.includes('could not read')) {
    return t('gen.pdfReadFailed');
  }
  if (m.includes('ia no pudo') || m.includes('tarjetas') || m.includes('flashcard') || m.includes('documento')) {
    return t('gen.aiNoCards');
  }
  return null;
}

function mapKnownServerMessage(
  message: string | undefined,
  context: ApiErrorContext,
  t: Translate
): string | null {
  if (!message) return null;
  const m = message.toLowerCase();

  if (m.includes('invalid credentials')) {
    return t('auth.invalidCredentials');
  }
  if (m.includes('user already exists')) {
    return t('auth.emailTaken');
  }
  if (m.includes('no existe una cuenta') || m.includes('no account')) {
    return t('auth.emailNotFound');
  }
  if (m.includes('verificación humana') || m.includes('turnstile') || m.includes('human verification')) {
    return t('auth.turnstileFailed');
  }
  if (m.includes('oauth') || m.includes('google')) {
    if (context === 'authOAuth') {
      return t('auth.oauthFailed');
    }
  }
  if (m.includes('inválido o expiró') || m.includes('invalid or expired')) {
    if (context === 'authReset' || context === 'authOAuth') {
      return t('auth.resetInvalidToken');
    }
  }

  if (m.includes('no se pudo guardar el pdf') || m.includes('could not save the pdf')) {
    return t('gen.pdfStorage');
  }

  if (m.includes('servicio de ia') || m.includes('ai service')) {
    if (context === 'deckGenerate' || context === 'eval') {
      return t('gen.generic');
    }
  }
  if (
    m.includes('interpretar la evaluación') ||
    m.includes('evaluación de la ia') ||
    m.includes('respuesta vacía') ||
    m.includes('no respondió')
  ) {
    if (context === 'eval') {
      return t('eval.generic');
    }
  }

  return null;
}

/** User-facing message for API failures (UTF-8 via i18n). Never exposes HTTP status codes. */
export function getApiErrorMessage(err: unknown, t: Translate, context: ApiErrorContext): string {
  if (parseQuotaExceeded(err)) {
    return context === 'eval' ? t('eval.quota') : t('gen.quota');
  }
  if (parseOverloaded(err)) {
    return context === 'eval' ? t('eval.overloaded') : t('gen.overloaded');
  }
  if (parseRateLimited(err)) {
    switch (context) {
      case 'authLogin':
      case 'authRegister':
      case 'authForgot':
      case 'authReset':
        return t('errors.rateLimitAuth');
      case 'deckGenerate':
        return t('errors.rateLimitGenerate');
      case 'eval':
        return t('errors.rateLimitEvaluate');
      default:
        return t('errors.rateLimitGeneric');
    }
  }

  const { status, serverMessage } = readPayload(err);

  if (status === 422 && context === 'deckGenerate') {
    const from422 = mapGenerate422(serverMessage, t);
    if (from422) return from422;
    if (serverMessage) return serverMessage;
  }

  const known = mapKnownServerMessage(serverMessage, context, t);
  if (known) {
    return known;
  }

  if (status === 401 && context === 'authLogin') {
    return t('auth.invalidCredentials');
  }
  if (status === 401 && (context === 'authRegister' || context === 'authOAuth')) {
    return fallbackKey(context) === 'auth.oauthFailed' ? t('auth.oauthFailed') : t(fallbackKey(context));
  }
  if (status === 409 && context === 'authRegister') {
    return t('auth.emailTaken');
  }
  if (status === 404 && context === 'authForgot') {
    return t('auth.emailNotFound');
  }
  if (status === 413 && context === 'deckGenerate') {
    return t('gen.generic');
  }

  if (isTimeout(err)) {
    return context === 'deckGenerate' ? t('gen.timeout') : t('errors.timeout');
  }

  if (isNetworkFailure(err) || (status === undefined && !serverMessage)) {
    return t('errors.network');
  }

  if (serverMessage && !/^\d{3}\b/.test(serverMessage) && !serverMessage.includes('HTTP')) {
    const looksTechnical =
      /^[A-Za-z_]+:/.test(serverMessage) ||
      serverMessage.includes('ECONN') ||
      serverMessage.includes('Unexpected');
    if (!looksTechnical) {
      return serverMessage;
    }
  }

  if (status === 502 || status === 503) {
    return t('errors.serverBusy');
  }
  if (status === 500 || (status !== undefined && status >= 500)) {
    return t('errors.server');
  }

  if (status === 403) {
    return t('errors.forbidden');
  }

  return t(fallbackKey(context));
}
