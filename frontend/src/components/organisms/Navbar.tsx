import { Button } from "../atoms/Button"
import { BrainCircuit, LogOut, Plus, TrendingUp, User } from "lucide-react"

export type TopbarRoute = "progress"

export interface NavbarProps {
  userEmail?: string;
  onGoHome: () => void;
  onLogout: () => void;
  /** Opens the create-deck drawer (topbar CTA). Wired in App → DeckDashboardContainer. */
  onOpenCreator: () => void;
  /** Navigation handler for the topbar links. No screens exist yet → default no-op. */
  onNavigate?: (route: TopbarRoute) => void;
}

const LINKS: { route: TopbarRoute; label: string; icon: typeof User }[] = [
  { route: "progress", label: "Progreso", icon: TrendingUp },
]

/**
 * Andel topbar — solid card surface, same background as the "Crear libro"
 * drawer (bg-card), floating over the mystic forest background.
 * Logo (library home) on the left; progress link,
 * the primary CTA "+ Nuevo Libro / Subir PDF" and avatar/logout on the right.
 * Labels collapse to icons below `sm`; the CTA keeps a compact "Nuevo" label.
 */
export function Navbar({ userEmail, onGoHome, onLogout, onOpenCreator, onNavigate }: NavbarProps) {
  const navigate = onNavigate ?? (() => {})
  const userInitial = userEmail?.trim().charAt(0).toUpperCase() ?? "?"

  return (
    <header className="sticky top-3 z-40 w-full">
      <div className="container mx-auto w-full max-w-6xl px-3 sm:px-4">
        <nav
          aria-label="Navegación principal"
          className="flex h-14 items-center justify-between gap-3 rounded-2xl border bg-card px-3 text-card-foreground shadow-[0_10px_28px_rgba(46,28,14,0.22)] sm:px-5"
        >
        {/* Logo — vuelve a la biblioteca */}
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Andel — ir a mi biblioteca"
          className="-ml-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuit className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Andel</span>
        </button>

        {/* Derecha: enlaces + CTA + avatar + logout */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {LINKS.map(({ route, label, icon: Icon }) => (
            <Button
              key={route}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(route)}
              aria-label={label}
              title={label}
              className="h-9 w-9 select-none text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </Button>
          ))}

          {/* CTA principal — abre el drawer de subida de PDF */}
          <Button
            type="button"
            onClick={onOpenCreator}
            className="h-9 px-3 sm:h-10 sm:px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">Nuevo Libro / Subir PDF</span>
          </Button>

          {userEmail && (
            <span
              aria-hidden="true"
              title={userEmail}
              className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border/60"
            >
              {userInitial}
            </span>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="h-9 w-9 select-none rounded-full text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </nav>
      </div>
    </header>
  )
}