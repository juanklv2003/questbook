import * as React from 'react'
import { DeckDashboardContainer } from './components/containers/DeckDashboardContainer'
import { StudySessionContainer } from './components/containers/StudySessionContainer'
import { Navbar, type TopbarRoute } from './components/organisms/Navbar'
import { CreateDeckDrawer } from './components/organisms/CreateDeckDrawer'
import { ProgressPanel, type ProgressBook } from './components/organisms/ProgressPanel'
import { SettingsPanel } from './components/organisms/SettingsPanel'
import { useDecks } from './hooks/useDecks'
import type { Deck } from './types'
import { BrainCircuit } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { AuthContainer } from './components/containers/AuthContainer'
import { BrandBackground } from './components/atoms/BrandBackground'
import { AmbientGlow } from './components/atoms/AmbientGlow'
import { PatternLayer } from './components/atoms/PatternLayer'
import { LanguageSwitch } from './components/atoms/LanguageSwitch'
import { useThemeSettings } from './hooks/useThemeSettings'
import { useLanguage } from './i18n/LanguageContext'

function App() {
  const { t } = useLanguage();
  const [activeDeckId, setActiveDeckId] = React.useState<string | null>(null);
  // Bumped by the topbar CTA to open the upload drawer
  // (see DeckDashboardContainer: createSignal).
  const [createSignal, setCreateSignal] = React.useState(0);
  // Global panel (Progress/Settings): renders as a drawer over the current
  // view — library or study session — without unmounting what is underneath.
  // Opening Settings from inside a book no longer kills the session.
  const [panelRoute, setPanelRoute] = React.useState<TopbarRoute | null>(null);
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  // Global library state (one GET /decks per session, see DeckContext).
  // Single access path: this guard consumes the store via useDecks only.
  const { refetch: refetchDecks } = useDecks();
  // Flat background only: color applied to DOM in lib/theme.ts
  // (only --brand/--brand-dark; buttons use the original primary).
  const { pattern } = useThemeSettings();
  const goHome = React.useCallback(() => setActiveDeckId(null), []);
  // Leaving a study session changed deck progress on the server: back in
  // the library, refresh the book data in case the progress panel opens
  // (no page reload needed). Stable `refetch` + null-transition guard fire
  // exactly once per study exit.
  const prevDeckId = React.useRef(activeDeckId);
  React.useEffect(() => {
    const wasInStudy = prevDeckId.current !== null && activeDeckId === null;
    prevDeckId.current = activeDeckId;
    if (wasInStudy) void refetchDecks();
  }, [activeDeckId, refetchDecks]);
  // "New Book / Upload PDF" from any view: back to the library, then
  // open the drawer. From a study session the dashboard remounts and would
  // absorb the current signal, so the increment is deferred one frame — just
  // enough for the fresh mount baseline ref to fall behind.
  const openCreator = React.useCallback(() => {
    if (activeDeckId === null) {
      setCreateSignal((s) => s + 1);
      return;
    }
    setActiveDeckId(null);
    window.setTimeout(() => setCreateSignal((s) => s + 1), 0);
  }, [activeDeckId]);
  const openPanel = React.useCallback((route: TopbarRoute) => {
    setPanelRoute((prev) => (prev === route ? null : route));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">{t("app.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pantalla de acceso: SIEMPRE el beige de marca (#D4C19F) y sin decoración
    // de fondo (ni resplandor ni patrón).
    // `bg-auth-backdrop` es un token FIJO: no usa --brand a propósito, así la
    // entrada se ve igual para todos sin importar el tema elegido en Ajustes.
    return (
      <div className="flex h-screen flex-col bg-auth-backdrop font-sans selection:bg-primary/20">
        {/* Mismo color que el fondo (sin border-b ni blur): la barra queda
            integrada al beige en vez de leerse como una franja aparte. */}
        <header className="sticky top-0 z-50 w-full bg-auth-backdrop">
          <div className="container mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BrainCircuit className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">QuestBook</span>
            </div>
            <LanguageSwitch />
          </div>
        </header>
        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
          <AuthContainer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-transparent text-foreground font-sans selection:bg-primary/20">
      {/* Fixed decor layers (viewport-anchored, z-0): brand base with bottom
          wash + AmbientGlow's bottom-anchored accent + pattern on top.
          MysticForestBackground intentionally not used: its opaque forest base
          would bury the flat brand color instead of composing with it. */}
      <BrandBackground />
      <AmbientGlow />
      <PatternLayer pattern={pattern} />
      <Navbar
        userEmail={user?.email}
        onGoHome={goHome}
        onLogout={logout}
        onOpenCreator={openCreator}
        onNavigate={openPanel}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Fixed bg layers are viewport-anchored, so scrolling here never
            moves or cuts them; y-auto (was overflow-clip) keeps tall library /
            study content reachable instead of clipped over a flat bottom. */}
        <main className="flex w-full flex-1 flex-col overflow-x-clip overflow-y-auto px-4">
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
              />
            )}
          </div>
        </main>
      </div>

      {/* App-level Progress/Settings panels: opening them from a study
          session no longer unmounts it (the dashboard used to remount and the
          card in progress was lost). */}
      <GlobalPanels route={panelRoute} onClose={() => setPanelRoute(null)} />
    </div>
  )
}

const PANEL_META: Record<TopbarRoute, { titleKey: "dash.panelProgressTitle" | "dash.panelSettingsTitle"; descKey: "dash.panelProgressDesc" | "dash.panelSettingsDesc" }> = {
  progress: { titleKey: "dash.panelProgressTitle", descKey: "dash.panelProgressDesc" },
  settings: { titleKey: "dash.panelSettingsTitle", descKey: "dash.panelSettingsDesc" },
};

/** Legacy payload aliases (title/cardCount) tolerated by the dashboard. */
type DeckLike = Deck & { title?: string; cardCount?: number };

/** Book display name with legacy `title` fallback. */
const deckTitle = (d: Deck): string => d.name || (d as DeckLike).title || "";

const cardCountOf = (d: Deck): number =>
  d.flashcardsCount || (d as DeckLike).cardCount || 0;

/**
 * Global drawer with Progress and Settings. Lives in App (not the dashboard)
 * so it opens from any screen — library or study session — without unmounting
 * what is underneath: opening Settings inside a book no longer drops the
 * session or loses the card in progress.
 */
function GlobalPanels({ route, onClose }: { route: TopbarRoute | null; onClose: () => void }) {
  const { decks } = useDecks();
  const settings = useThemeSettings();
  const { t } = useLanguage();
  const meta = route ? PANEL_META[route] : null;

  const progressBooks = React.useMemo<ProgressBook[]>(
    () =>
      decks.map((d) => ({
        id: d.id,
        name: deckTitle(d),
        cards: cardCountOf(d),
        progress: d.progressPercent ?? null,
      })),
    [decks]
  );
  const totalCards = React.useMemo(
    () => progressBooks.reduce((sum, b) => sum + b.cards, 0),
    [progressBooks]
  );
  const averageProgress = React.useMemo(() => {
    const tracked = progressBooks.filter(
      (b): b is ProgressBook & { progress: number } => typeof b.progress === "number"
    );
    if (tracked.length === 0) return null;
    return Math.round(tracked.reduce((sum, b) => sum + b.progress, 0) / tracked.length);
  }, [progressBooks]);

  return (
    <CreateDeckDrawer
      open={route !== null}
      onClose={onClose}
      title={meta ? t(meta.titleKey) : ""}
      description={meta ? t(meta.descKey) : ""}
    >
      {route === "progress" && (
        <ProgressPanel
          totalBooks={decks.length}
          totalCards={totalCards}
          averageProgress={averageProgress}
          books={progressBooks}
        />
      )}
      {route === "settings" && (
        <SettingsPanel
          themeId={settings.themeId}
          customColor={settings.customColor}
          savedColors={settings.savedColors}
          pattern={settings.pattern}
          onPickTheme={settings.pickTheme}
          onCustomColorChange={settings.changeCustomColor}
          onRemoveSavedColor={settings.removeColor}
          hiddenThemes={settings.hiddenThemes}
          onHidePreset={settings.hidePreset}
          onRestorePresets={settings.restorePresets}
          onPatternChange={settings.changePattern}
        />
      )}
    </CreateDeckDrawer>
  );
}

export default App
