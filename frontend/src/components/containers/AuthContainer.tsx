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
    <div className="flex w-full flex-1 flex-col items-center justify-center px-3 py-4 sm:px-4 sm:py-6 md:py-10">
      <div className="flex w-full max-w-4xl shrink-0 flex-col items-center gap-4 md:flex-row md:gap-12">
        {/* Marca grande solo en tablet/escritorio (en móvil ya está en el header). */}
        <div className="hidden flex-col items-center gap-4 text-center md:flex md:w-1/2">
          <img
            src={magicBook}
            alt=""
            aria-hidden="true"
            className="h-56 w-56 object-cover"
          />
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">QuestBook</h1>
            <p className="text-base text-muted-foreground">{t('auth.brandTagline')}</p>
          </div>
        </div>

        {/* Tarjeta: en móvil altura acotada + scroll interno para teclado / Turnstile / Google */}
        <div className="flex w-full max-w-md max-h-[calc(100dvh-5.25rem-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden rounded-2xl border bg-card text-foreground shadow-xl shadow-black/10 md:max-h-none md:w-1/2">
          <div
            role="tablist"
            aria-label={t('auth.tabsLabel')}
            className="grid shrink-0 grid-cols-2 gap-1 border-b bg-secondary/40 p-1.5"
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
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 md:p-7 [-webkit-overflow-scrolling:touch]"
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