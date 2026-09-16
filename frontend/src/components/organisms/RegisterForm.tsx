import React, { useState } from 'react';
import { CircleAlert, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../atoms/Input';
import { PasswordField } from '../atoms/PasswordField';
import { Button } from '../atoms/Button';
import { useLanguage } from '../../i18n/LanguageContext';

interface RegisterFormProps {
  onSuccess?: () => void;
}

/** Contenido del panel de registro (la tarjeta y las tabs viven en AuthContainer). */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { t } = useLanguage();
  const { register, error: authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

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

    try {
      await register({ email, password });
      if (onSuccess) onSuccess();
    } catch {
      // Handled by AuthContext error state
    }
  };

  const errorMessage = localError || authError;

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

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? t("auth.registerLoading") : t("auth.registerCta")}
      </Button>
    </form>
  );
};