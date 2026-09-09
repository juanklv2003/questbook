import { Check, PaintBucket, Palette, Sparkles, TreePine } from "lucide-react";
import {
  BACKGROUND_OPTIONS,
  CUSTOM_THEME_ID,
  THEMES,
  type BackgroundMode,
} from "../../lib/theme";
import { cn } from "../../lib/utils";

export interface SettingsPanelProps {
  themeId: string;
  customColor: string;
  background: BackgroundMode;
  onPickTheme: (id: string) => void;
  onCustomColorChange: (color: string) => void;
  onBackgroundChange: (mode: BackgroundMode) => void;
}

const BG_ICONS: Record<BackgroundMode, typeof TreePine> = {
  bosque: TreePine,
  resplandor: Sparkles,
  color: PaintBucket,
};

/**
 * Panel de Ajustes — puramente presentacional, sin fetch.
 * Sección Color (grid de swatches estilo Pomopopo: presets + personalizado,
 * anillo + Check en el activo; el color SOLO cambia el fondo de la web,
 * nunca los botones) y sección Fondo (tres opciones reales y persistidas:
 * bosque / resplandor / color). Tono y espaciados iguales a ProgressPanel.
 */
export function SettingsPanel({
  themeId,
  customColor,
  background,
  onPickTheme,
  onCustomColorChange,
  onBackgroundChange,
}: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="settings-color-title">
        <h3
          id="settings-color-title"
          className="text-sm font-semibold tracking-tight"
        >
          Color
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          El color se aplica al fondo de la web.
        </p>
        <div
          className="mt-3 flex flex-wrap gap-3"
          role="group"
          aria-label="Elegir color de acento"
        >
          {THEMES.map((theme) => {
            const active = themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onPickTheme(theme.id)}
                aria-pressed={active}
                aria-label={`Color ${theme.label}`}
                title={theme.label}
                style={{ backgroundColor: theme.brand }}
                className={cn(
                  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  active && "ring-2 ring-ring ring-offset-2 ring-offset-card"
                )}
              >
                {active && (
                  <Check
                    className="h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* Color personalizado: el label abre el picker nativo */}
          <label
            title="Color personalizado"
            aria-label="Color personalizado"
            className={cn(
              "relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-transform duration-200 hover:scale-105 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card",
              themeId === CUSTOM_THEME_ID &&
                "ring-2 ring-ring ring-offset-2 ring-offset-card"
            )}
            style={{ backgroundColor: customColor }}
          >
            <span className="sr-only">Elegir color personalizado</span>
            <input
              type="color"
              value={customColor}
              aria-label="Elegir color personalizado"
              aria-pressed={themeId === CUSTOM_THEME_ID}
              onChange={(e) => onCustomColorChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            {themeId === CUSTOM_THEME_ID ? (
              <Check
                className="pointer-events-none h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                aria-hidden="true"
              />
            ) : (
              <Palette
                className="pointer-events-none h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                aria-hidden="true"
              />
            )}
          </label>
        </div>
      </section>

      <section aria-labelledby="settings-bg-title">
        <h3
          id="settings-bg-title"
          className="text-sm font-semibold tracking-tight"
        >
          Fondo
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Elegí cómo se ve el fondo de tu biblioteca.
        </p>
        <ul className="mt-3 flex flex-col gap-3" aria-label="Opciones de fondo">
          {BACKGROUND_OPTIONS.map((option) => {
            const Icon = BG_ICONS[option.id];
            const active = background === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => onBackgroundChange(option.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    active && "border-primary/60 bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold tracking-tight">
                      {option.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {active && (
                    <Check
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
