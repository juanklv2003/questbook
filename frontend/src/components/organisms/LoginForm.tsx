import React, { useState } from 'react';
import { CircleAlert, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../atoms/Input';
import { PasswordField } from '../atoms/PasswordField';
import { Button } from '../atoms/Button';
import { useLanguage } from '../../i18n/LanguageContext';

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

/** Contenido del panel de login (la tarjeta y las tabs viven en AuthContainer). */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onForgotPassword }) => {
  const { t } = useLanguage();
  const { login, error: authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError(t("auth.requiredLogin"));
      return;
    }

    try {
      await login({ email, password, rememberMe });
      if (onSuccess) onSuccess();
    } catch {
      // Error is already handled and stored in AuthContext error state
      // but we could also do local error handling if needed
    }
  };

  const errorMessage = localError || authError;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-semibold tracking-tight">{t("auth.loginTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
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
          <label htmlFor="email" className="text-sm font-medium leading-none">
            {t("auth.email")}
          </label>
          <Input
            id="email"
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
          <label htmlFor="password" className="text-sm font-medium leading-none">
            {t("auth.password")}
          </label>
          <PasswordField
            id="password"
            icon={<Lock className="h-4 w-4" />}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          {onForgotPassword && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={isLoading}
                className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-60"
              >
                {t("auth.forgotLink")}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="rememberMe"
            className="h-4 w-4 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <label htmlFor="rememberMe" className="cursor-pointer select-none text-sm text-muted-foreground">
            {t("auth.rememberMe")}
          </label>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? t("auth.loginLoading") : t("auth.loginCta")}
      </Button>
    </form>
  );
};