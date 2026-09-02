import * as React from 'react'
import { DeckDashboardContainer } from './components/containers/DeckDashboardContainer'
import { StudySessionContainer } from './components/containers/StudySessionContainer'
import { BrainCircuit, LogOut } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { AuthContainer } from './components/containers/AuthContainer'

function App() {
  const [activeDeckId, setActiveDeckId] = React.useState<string | null>(null);
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight">Memo AI</span>
            </div>
          </div>
        </header>
        <AuthContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-[#8B5A2B]/30 bg-[#6B3E1F]/95 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveDeckId(null)}>
            <div className="w-8 h-8 rounded-lg bg-[#C4884D] text-white flex items-center justify-center shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#F5E6D3]">Memo AI</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-[#D4B896]">
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => setActiveDeckId(null)}>Panel</span>
            <span className="truncate max-w-[150px]">{user?.email}</span>
            <button onClick={logout} className="hover:text-white cursor-pointer transition-colors flex items-center gap-1">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 max-w-6xl w-full flex flex-col">
        {activeDeckId ? (
          <StudySessionContainer 
            deckId={activeDeckId} 
            onBack={() => setActiveDeckId(null)} 
          />
        ) : (
          <DeckDashboardContainer onSelectDeck={setActiveDeckId} />
        )}
      </main>

      <footer className="border-t border-[#8B5A2B]/30 py-6 mt-auto text-center text-sm text-[#8B6B4A]">
        <p>Construido con React y Tailwind. Desarrollado por Gemini.</p>
      </footer>
    </div>
  )
}

export default App
