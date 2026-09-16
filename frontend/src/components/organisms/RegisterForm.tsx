import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../atoms/Input';
import { PasswordField } from '../atoms/PasswordField';
import { Button } from '../atoms/Button';
import { useLanguage } from '../../i18n/LanguageContext';

interface RegisterFormProps {
  onSuccess?: () => void;
}

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto p-6 bg-card rounded-xl border shadow-sm">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{t("auth.registerTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
      </div>

      {(localError || authError) && (
        <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
          {localError || authError}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="register-email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("auth.email")}
          </label>
          <Input
            id="register-email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="register-password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("auth.password")}
          </label>
          <PasswordField
            id="register-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("auth.confirmPassword")}
          </label>
          <PasswordField
            id="confirm-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t("auth.registerLoading") : t("auth.registerCta")}
      </Button>
    </form>
  );
};
