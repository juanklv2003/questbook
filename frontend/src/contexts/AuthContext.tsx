import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import { completeOAuthLogin, takePendingOAuthCode } from '../lib/oauthSession';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
} from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True solo durante el chequeo inicial de sesión. App lo usa para la
      pantalla de carga; los forms usan `isLoading` (que NO desmonta nada). */
  isInitializing: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  requestPasswordReset: (payload: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (payload: ResetPasswordRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async (options?: { keepError?: boolean }) => {
    try {
      setIsLoading(true);
      if (!options?.keepError) {
        setError(null);
      }
      const response = await apiClient.get('/auth/me');
      // Backend respond `GET /auth/me` with `{ user: {...} }`; unwrap it so
      // `user.email` (navbar avatar) is not `undefined`.
      const user = response.data?.user as User | undefined;
      if (user) {
        setUser(user);
        setIsAuthenticated(true);
      }
    } catch (err: unknown) {
      // Only a 401 (invalid/expired token) counts as "no session".
      // Network errors or unresponsive server (500/timeout/ECONNREFUSED)
      // must NOT log the user out: it could be a momentary failure and we
      // would kick them off the page unfairly (e.g. a heavy PDF still processing).
      const status = err instanceof Object && err !== null && 'response' in err && err.response instanceof Object && err.response !== null && 'status' in err.response ? err.response.status : undefined;
      if (status === 401) {
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const pendingOAuthCode = takePendingOAuthCode();

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      params.delete('error');
      const qs = params.toString();
      const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
      setIsInitializing(false);
    } else {
      const finishInit = async () => {
        if (pendingOAuthCode) {
          try {
            setIsLoading(true);
            const oauthUser = await completeOAuthLogin(pendingOAuthCode);
            if (oauthUser) {
              setUser(oauthUser);
              setIsAuthenticated(true);
              setIsInitializing(false);
              setIsLoading(false);
              return;
            }
          } catch (err: unknown) {
            const message =
              err instanceof Object &&
              err !== null &&
              'response' in err &&
              err.response instanceof Object &&
              err.response !== null &&
              'data' in err.response &&
              err.response.data instanceof Object &&
              err.response.data !== null &&
              'error' in err.response.data &&
              typeof (err.response.data as { error: unknown }).error === 'string'
                ? (err.response.data as { error: string }).error
                : t('auth.loginError');
            setError(message);
            return;
          } finally {
            setIsLoading(false);
          }
        }
        await checkAuth();
      };

      finishInit().finally(() => setIsInitializing(false));
    }

    // Any authenticated request answering 401 (invalid/expired session)
    // clears the auth state so the app returns to login automatically.
    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.post('/auth/login', credentials);
      await checkAuth();
    } catch (err: unknown) {
      const message =
        err instanceof Object &&
        err !== null &&
        'response' in err &&
        err.response instanceof Object &&
        err.response !== null &&
        'data' in err.response &&
        err.response.data instanceof Object &&
        err.response.data !== null &&
        'error' in err.response.data &&
        typeof (err.response.data as { error: unknown }).error === 'string'
          ? (err.response.data as { error: string }).error
          : err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : t('auth.loginError');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.post('/auth/register', credentials);
      await checkAuth();
    } catch (err: unknown) {
      const message =
        err instanceof Object &&
        err !== null &&
        'response' in err &&
        err.response instanceof Object &&
        err.response !== null &&
        'data' in err.response &&
        err.response.data instanceof Object &&
        err.response.data !== null &&
        'error' in err.response.data &&
        typeof (err.response.data as { error: unknown }).error === 'string'
          ? (err.response.data as { error: string }).error
          : err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : t('auth.registerError');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (payload: ForgotPasswordRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', payload);
      return response.data;
    } catch (err: unknown) {
      const message =
        err instanceof Object &&
        err !== null &&
        'response' in err &&
        err.response instanceof Object &&
        err.response !== null &&
        'data' in err.response &&
        err.response.data instanceof Object &&
        err.response.data !== null &&
        'error' in err.response.data &&
        typeof (err.response.data as { error: unknown }).error === 'string'
          ? (err.response.data as { error: string }).error
          : err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : t('auth.forgotError');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (payload: ResetPasswordRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.post('/auth/reset-password', payload);
    } catch (err: unknown) {
      const message =
        err instanceof Object &&
        err !== null &&
        'response' in err &&
        err.response instanceof Object &&
        err.response !== null &&
        'data' in err.response &&
        err.response.data instanceof Object &&
        err.response.data !== null &&
        'error' in err.response.data &&
        typeof (err.response.data as { error: unknown }).error === 'string'
          ? (err.response.data as { error: string }).error
          : err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : t('auth.resetError');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.post('/auth/logout');
      setUser(null);
      setIsAuthenticated(false);
    } catch (err: unknown) {
      const message =
        err instanceof Object &&
        err !== null &&
        'response' in err &&
        err.response instanceof Object &&
        err.response !== null &&
        'data' in err.response &&
        err.response.data instanceof Object &&
        err.response.data !== null &&
        'error' in err.response.data &&
        typeof (err.response.data as { error: unknown }).error === 'string'
          ? (err.response.data as { error: string }).error
          : err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : t('auth.logoutError');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, isInitializing, error, login, register, requestPasswordReset, resetPassword, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
