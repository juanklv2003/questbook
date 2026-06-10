import React, { useState } from 'react';
import { LoginForm } from '../organisms/LoginForm';
import { RegisterForm } from '../organisms/RegisterForm';
import { useAuth } from '../../contexts/AuthContext';

export const AuthContainer: React.FC = () => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const { isLoading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-md">
        {view === 'login' ? <LoginForm /> : <RegisterForm />}
        
        <div className="mt-6 text-center text-sm">
          {view === 'login' ? (
            <p className="text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => setView('register')}
                disabled={isLoading}
                className="font-medium text-primary hover:underline focus:outline-none cursor-pointer"
              >
                Regístrate
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => setView('login')}
                disabled={isLoading}
                className="font-medium text-primary hover:underline focus:outline-none cursor-pointer"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
