import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import magicBook from '../../assets/libro.png';
import { LoginForm } from '../organisms/LoginForm';
import { RegisterForm } from '../organisms/RegisterForm';
import { ForgotPasswordForm } from '../organisms/ForgotPasswordForm';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { cn } from '../../lib/utils';

type AuthView = 'login' | 'register' | 'forgot';

/**
 * Entrada a la app: marca + tarjeta de acceso que conmuta Login/Registro.
 *
 * El fondo (arena fijo, sin decoración de fondo) y el header viven en App; acá
 * solo se compone la tarjeta. La tarjeta es una superficie sólida (`bg-card`)
 * con su propio color de texto: sobre un fondo plano el glass ya no aportaba
 * nada y su opacidad bajaba el contraste de inputs y labels.
 *
  * `min-h-full` (no `min-h-screen`) deja que el contenedor de scroll de App
  * centre en pantallas altas y permita scroll en las bajas: el registro (3
  * campos + hint) ya no se corta en un móvil de 640px de alto.
  *
  * Layout en dos columnas desde `md`: marca en grande a la izquierda,
  * tarjeta de acceso a la derecha. En móvil se apila (marca compacta arriba).
   */
 export const AuthContainer: React.FC = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<AuthView>('login');
  const { isLoading } = useAuth();
  const reduceMotion = useReducedMotion();

  const tabs: { id: Exclude<AuthView, 'forgot'>; label: string }[] = [
    { id: 'login', label: t('auth.signIn') },
    { id: 'register', label: t('auth.signUp') },
  ];

  // La vista "forgot" no tiene tab propia: se entra desde el link del login
  // y se sale con "volver". El panel anima igual que el cambio login/register.
  const activeTab: Exclude<AuthView, 'forgot'> = view === 'forgot' ? 'login' : view;

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 sm:py-10">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 md:flex-row md:gap-12">
        {/* Marca a la izquierda, en grande. */}
        <div className="flex flex-col items-center gap-4 text-center md:w-1/2">
          <img
            src={magicBook}
            alt=""
            aria-hidden="true"
            className="h-24 w-24 object-cover md:h-56 md:w-56"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">QuestBook</h1>
            <p className="text-sm text-muted-foreground md:text-base">{t('auth.brandTagline')}</p>
          </div>
        </div>

        {/* Tarjeta de acceso a la derecha: superficie sólida sobre el arena, para máximo
            contraste de inputs, labels y del CTA marrón. */}
        <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card text-foreground shadow-xl shadow-black/10 md:w-1/2">
          <div
            role="tablist"
            aria-label={t('auth.tabsLabel')}
            className="grid grid-cols-2 gap-1 border-b bg-secondary/40 p-1.5"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`auth-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls="auth-panel"
                  onClick={() => setView(tab.id)}
                  disabled={isLoading}
                  className={cn(
                    'h-9 cursor-pointer rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-60',
                    active
                      ? 'bg-card font-semibold text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <motion.div
            key={view}
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={`auth-tab-${activeTab}`}
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="p-6 sm:p-7"
          >
            {view === 'forgot' ? (
              <ForgotPasswordForm onBackToLogin={() => setView('login')} />
            ) : view === 'login' ? (
              <LoginForm onForgotPassword={() => setView('forgot')} />
            ) : (
              <RegisterForm />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};