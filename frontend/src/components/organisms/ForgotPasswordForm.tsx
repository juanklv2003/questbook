import React, { useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { CheckCircle2, CircleAlert, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../atoms/Input';
import { PasswordField } from '../atoms/PasswordField';
import { Button } from '../atoms/Button';
import { useLanguage } from '../../i18n/LanguageContext';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

// Site key PÚBLICA de Cloudflare Turnstile (no es secreta: viaja en el bundle).
// Misma key que el registro; solo el paso 1 (pedido) exige verificación.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/**
 * Flujo "olvidé mi contraseña" en 2 pasos (sin email: no hay SMTP).
 * Paso 1: email + Turnstile → backend devuelve el token de un solo uso.
 * Paso 2: nueva + confirmar → se guarda hasheada y el token queda usado.
 */
export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const { t } = useLanguage();
  const { requestPasswordReset, resetPassword, error: authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email) {
      setLocalError(t('auth.requiredLogin'));
      return;
    }
    if (!TURNSTILE_SITE_KEY) {
      setLocalError(t('auth.turnstileNotConfigured'));
      return;
    }
    if (!turnstileToken) {
      setLocalError(t('auth.forgotTurnstileRequired'));
      return;
    }

    try {
      const result = await requestPasswordReset({ email, turnstileToken });
      setResetToken(result.resetToken);
    } catch {
      // El token de Turnstile ya se consumió: se resetea el widget para
      // exigir una verificación fresca antes de reintentar (igual que registro).
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!newPassword || !confirmPassword) {
      setLocalError(t('auth.requiredRegister'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError(t('auth.passwordMismatch'));
      return;
    }
    if (!resetToken) {
      setLocalError(t('auth.resetInvalidToken'));
      return;
    }

    try {
      await resetPassword({ token: resetToken, newPassword });
      setSuccess(true);
    } catch {
      // El mensaje ya quedó en AuthContext (400 genérico del backend).
    }
  };

  const errorMessage = localError || authError;

  if (success) {
    return (
      <div className="space-y-4 text-center sm:space-y-5">
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-left text-sm"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="min-w-0 break-words text-foreground">{t('auth.resetSuccess')}</span>
        </div>
        <Button type="button" size="default" className="w-full sm:h-11 sm:px-8 sm:text-base" onClick={onBackToLogin}>
          {t('auth.signIn')}
        </Button>
      </div>
    );
  }

  // Paso 2: el backend ya entregó el token de un solo uso.
  if (resetToken) {
    return (
      <form onSubmit={handleReset} className="space-y-4 sm:space-y-5">
        <div className="space-y-1 text-center sm:space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t('auth.resetTitle')}</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">{t('auth.resetSubtitle')}</p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span className="min-w-0 break-words text-foreground">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <label htmlFor="reset-new-password" className="text-sm font-medium leading-none">
              {t('auth.newPassword')}
            </label>
            <PasswordField
              id="reset-new-password"
              icon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="reset-confirm-password" className="text-sm font-medium leading-none">
              {t('auth.confirmPassword')}
            </label>
            <PasswordField
              id="reset-confirm-password"
              icon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <Button type="submit" size="default" className="w-full sm:h-11 sm:px-8 sm:text-base" disabled={isLoading}>
          {isLoading ? t('auth.resetLoading') : t('auth.resetCta')}
        </Button>
      </form>
    );
  }

  // Paso 1: pedido del token.
  const canSubmit = !isLoading && Boolean(TURNSTILE_SITE_KEY) && Boolean(turnstileToken);

  return (
    <form onSubmit={handleRequest} className="space-y-4 sm:space-y-5">
      <div className="space-y-1 text-center sm:space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t('auth.forgotTitle')}</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">{t('auth.forgotSubtitle')}</p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <span className="min-w-0 break-words text-foreground">{errorMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="forgot-email" className="text-sm font-medium leading-none">
          {t('auth.email')}
        </label>
        <Input
          id="forgot-email"
          type="email"
          icon={<Mail className="h-4 w-4" />}
          placeholder="m@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {TURNSTILE_SITE_KEY ? (
        <div className="flex justify-center">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setLocalError(null);
            }}
            onExpire={() => {
              setTurnstileToken(null);
              setLocalError(t('auth.turnstileExpired'));
            }}
            onError={() => setTurnstileToken(null)}
          />
        </div>
      ) : (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <span className="min-w-0 break-words text-foreground">{t('auth.turnstileNotConfigured')}</span>
        </div>
      )}

      <Button type="submit" size="default" className="w-full sm:h-11 sm:px-8 sm:text-base" disabled={!canSubmit}>
        {isLoading ? t('auth.forgotLoading') : t('auth.forgotCta')}
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        disabled={isLoading}
        className="w-full cursor-pointer text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-60"
      >
        {t('auth.forgotBack')}
      </button>
    </form>
  );
};
