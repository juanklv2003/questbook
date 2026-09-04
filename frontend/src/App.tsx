import * as React from 'react'
import { DeckDashboardContainer } from './components/containers/DeckDashboardContainer'
import { StudySessionContainer } from './components/containers/StudySessionContainer'
import { Button } from './components/atoms/Button'
import { BrainCircuit, LogOut } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { AuthContainer } from './components/containers/AuthContainer'
import { MysticForestBackground } from './components/atoms/MysticForestBackground'

function App() {
  const [activeDeckId, setActiveDeckId] = React.useState<string | null>(null);
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const goHome = React.useCallback(() => setActiveDeckId(null), []);
  const userInitial = user?.email?.trim().charAt(0).toUpperCase() ?? "?";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent text-foreground font-sans selection:bg-primary/20 flex flex-col">
        <MysticForestBackground />
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
    <div className="min-h-screen bg-transparent text-foreground font-sans selection:bg-primary/20">
      <MysticForestBackground />
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={goHome}
            aria-label="Andel — ir a mi biblioteca"
            className="-ml-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Andel</span>
          </button>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {user?.email && (
              <span
                aria-hidden="true"
                title={user.email}
                className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border/60"
              >
                {userInitial}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="h-9 w-9 select-none rounded-full text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex w-full flex-1 flex-col px-4">
          <div className="container mx-auto w-full max-w-6xl flex-1 flex flex-col">
            {activeDeckId ? (
              <StudySessionContainer
                deckId={activeDeckId}
                onBack={() => setActiveDeckId(null)}
              />
            ) : (
              <DeckDashboardContainer
                onSelectDeck={setActiveDeckId}
              />
            )}
          </div>
        </main>

        <footer className="border-t py-6 mt-auto text-center text-sm text-muted-foreground">
          <p>Construido con React y Tailwind. Desarrollado por Gemini.</p>
        </footer>
      </div>
    </div>
  )
}

export default App
