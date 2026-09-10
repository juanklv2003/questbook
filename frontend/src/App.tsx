import * as React from 'react'
import { DeckDashboardContainer } from './components/containers/DeckDashboardContainer'
import { StudySessionContainer } from './components/containers/StudySessionContainer'
import { Navbar, type TopbarRoute } from './components/organisms/Navbar'
import type { PanelSignal } from './components/containers/DeckDashboardContainer'
import { BrainCircuit } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { AuthContainer } from './components/containers/AuthContainer'
import { BrandBackground } from './components/atoms/BrandBackground'
import { PatternLayer } from './components/atoms/PatternLayer'
import { useThemeSettings } from './hooks/useThemeSettings'

function App() {
  const [activeDeckId, setActiveDeckId] = React.useState<string | null>(null);
  // Incrementada por el CTA de la topbar para abrir el drawer de subida
  // (ver DeckDashboardContainer: createSignal).
  const [createSignal, setCreateSignal] = React.useState(0);
  // Same deferred pattern for the topbar progress panel:
  // the dashboard unmounts during a study session, so opening from there
  // returns home first and defers one frame.
  const [panelSignal, setPanelSignal] = React.useState<PanelSignal | null>(null);
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  // Flat background only: color applied to DOM in lib/theme.ts
  // (only --brand/--brand-dark; buttons use the original primary).
  const { pattern } = useThemeSettings();
  const goHome = React.useCallback(() => setActiveDeckId(null), []);
  // "+ Nuevo Libro / Subir PDF" desde cualquier vista: vuelve a la biblioteca y
  // abre el drawer. Desde una sesión de estudio el dashboard se monta de nuevo y
  // absorbe la señal actual, así que el incremento se difiere un frame — tiempo
  // suficiente para que el ref de base del montaje nuevo quede detrás.
  const openCreator = React.useCallback(() => {
    if (activeDeckId === null) {
      setCreateSignal((s) => s + 1);
      return;
    }
    setActiveDeckId(null);
    window.setTimeout(() => setCreateSignal((s) => s + 1), 0);
  }, [activeDeckId]);
  const openPanel = React.useCallback((route: TopbarRoute) => {
    if (activeDeckId === null) {
      setPanelSignal((s) => ({ route, n: (s?.n ?? 0) + 1 }));
      return;
    }
    setActiveDeckId(null);
    window.setTimeout(
      () => setPanelSignal((s) => ({ route, n: (s?.n ?? 0) + 1 })),
      0
    );
  }, [activeDeckId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Login: beige biblioteca original, siempre mate (bg-background = 36 39% 94%).
    // No renderiza fondos temados (Brand/Mystic/Glow/Pattern) para ignorar
    // andel-theme / var(--brand) guardado. La app autenticada debajo sí los usa.
    return (
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BrainCircuit className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">Andel</span>
            </div>
          </div>
        </header>
        <div className="relative z-10 flex flex-1 flex-col">
          <AuthContainer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-transparent text-foreground font-sans selection:bg-primary/20">
      <BrandBackground />
      <PatternLayer pattern={pattern} />
      <Navbar
        userEmail={user?.email}
        onGoHome={goHome}
        onLogout={logout}
        onOpenCreator={openCreator}
        onNavigate={openPanel}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <main className="flex w-full flex-1 flex-col overflow-clip px-4">
          <div className="container mx-auto w-full max-w-6xl flex-1 flex flex-col">
            {activeDeckId ? (
              <StudySessionContainer
                deckId={activeDeckId}
                onBack={() => setActiveDeckId(null)}
              />
            ) : (
              <DeckDashboardContainer
                onSelectDeck={setActiveDeckId}
                createSignal={createSignal}
                panelSignal={panelSignal}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
