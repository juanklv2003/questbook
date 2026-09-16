import React, { useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { CircleAlert, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../atoms/Input';
import { PasswordField } from '../atoms/PasswordField';
import { Button } from '../atoms/Button';
import { GoogleSignInButton } from '../atoms/GoogleSignInButton';
import { useLanguage } from '../../i18n/LanguageContext';

interface RegisterFormProps {
  onSuccess?: () => void;
}

// Site key PÚBLICA de Cloudflare Turnstile (no es secreta: viaja en el bundle).
// Se configura con VITE_TURNSTILE_SITE_KEY (ver frontend/.env.example).
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Contenido del panel de registro (la tarjeta y las tabs viven en AuthContainer). */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { t } = useLanguage();
  const { register, error: authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password || !confirmPassword) {
      setLocalError(t("auth.requiredRegister"));
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(t("auth.passwordMismatch"));
      return;
    }

    // Sin site key el widget no puede renderizarse: no se intenta el registro.
    if (!TURNSTILE_SITE_KEY) {
      setLocalError(t("auth.turnstileNotConfigured"));
      return;
    }

    // El token es de un solo uso y expira: sin token válido no hay request.
    if (!turnstileToken) {
      setLocalError(t("auth.turnstileRequired"));
      return;
    }

    try {
      await register({ email, password, turnstileToken });
      if (onSuccess) onSuccess();
    } catch {
      // El token ya se consumió (o era inválido): se resetea el widget para
      // que el usuario complete una verificación fresca antes de reintentar.
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      // Handled by AuthContext error state
    }
  };

  const errorMessage = localError || authError;
  // El botón queda DESHABILITADO hasta que Turnstile devuelva un token válido.
  const canSubmit = !isLoading && Boolean(TURNSTILE_SITE_KEY) && Boolean(turnstileToken);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-semibold tracking-tight">{t("auth.registerTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
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

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="register-email" className="text-sm font-medium leading-none">
            {t("auth.email")}
          </label>
          <Input
            id="register-email"
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

        <div className="space-y-2">
          <label htmlFor="register-password" className="text-sm font-medium leading-none">
            {t("auth.password")}
          </label>
          <PasswordField
            id="register-password"
            icon={<Lock className="h-4 w-4" />}
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium leading-none">
            {t("auth.confirmPassword")}
          </label>
          <PasswordField
            id="confirm-password"
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
              setLocalError(t("auth.turnstileExpired"));
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
          <span className="min-w-0 break-words text-foreground">{t("auth.turnstileNotConfigured")}</span>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
        {isLoading ? t("auth.registerLoading") : t("auth.registerCta")}
      </Button>

      {!isLoading && (
        <>
          <div className="flex items-center gap-0.5">
            <div className="w-full border-t border-border/50" />
            <span className="whitespace-nowrap text-xs text-muted-foreground">{t('auth.orContinueWith')}</span>
            <div className="w-full border-t border-border/50" />
          </div>
          <GoogleSignInButton />
        </>
      )}
    </form>
  );
};
