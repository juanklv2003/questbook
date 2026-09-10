import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import { useLanguage } from '../i18n/LanguageContext';
import type { User, LoginCredentials, RegisterCredentials } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (err: any) {
      // Only a 401 (invalid/expired token) counts as "no session".
      // Network errors or unresponsive server (500/timeout/ECONNREFUSED)
      // must NOT log the user out: it could be a momentary failure and we
      // would kick them off the page unfairly (e.g. a heavy PDF still processing).
      const status = err?.response?.status;
      if (status === 401) {
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

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
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || t('auth.loginError'));
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
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || t('auth.registerError'));
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
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || t('auth.logoutError'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, error, login, register, logout, checkAuth }}>
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
