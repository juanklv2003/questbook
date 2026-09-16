import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../atoms/Input';
import { PasswordField } from '../atoms/PasswordField';
import { Button } from '../atoms/Button';
import { useLanguage } from '../../i18n/LanguageContext';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto p-6 bg-card rounded-xl border shadow-sm">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{t("auth.loginTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>

      {(localError || authError) && (
        <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
          {localError || authError}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("auth.email")}
          </label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("auth.password")}
          </label>
          <PasswordField
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="rememberMe"
            className="h-4 w-4 rounded border-input focus:ring-ring focus:ring-offset-2"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <label
            htmlFor="rememberMe"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("auth.rememberMe")}
          </label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t("auth.loginLoading") : t("auth.loginCta")}
      </Button>
    </form>
  );
};
