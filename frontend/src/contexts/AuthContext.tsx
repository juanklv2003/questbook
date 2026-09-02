import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/axios';
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
      // Solo consideramos "sin sesión" cuando el servidor responde 401 (token inválido/caducado).
      // Si es un error de red o el servidor no responde (500/timeout/ECONNREFUSED),
      // NO deslogueamos al usuario: podría ser un fallo momentáneo y lo echaríamos
      // de la página injustamente (ej: un PDF pesado aún procesándose).
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

    // Si cualquier petición autenticada responde 401 (sesión inválida/caducada),
    // limpiamos el estado de autenticación para volver al login automáticamente.
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
      setError(err.response?.data?.error || err.message || 'Error al iniciar sesión');
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
      setError(err.response?.data?.error || err.message || 'Error al registrarse');
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
      setError(err.response?.data?.error || err.message || 'Error al cerrar sesión');
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
