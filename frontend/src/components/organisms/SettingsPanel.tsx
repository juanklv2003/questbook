import {
  Ban,
  Check,
  Circle,
  Coffee,
  Flower2,
  Palette,
  PawPrint,
  RotateCcw,
  Star,
  Triangle,
  X,
} from "lucide-react";
import {
  CUSTOM_THEME_ID,
  PATTERN_OPTIONS,
  THEMES,
  type PatternId,
} from "../../lib/theme";
import { cn } from "../../lib/utils";

export interface SettingsPanelProps {
  themeId: string;
  customColor: string;
  savedColors: string[];
  hiddenThemes: string[];
  pattern: PatternId;
  onPickTheme: (id: string) => void;
  onCustomColorChange: (color: string) => void;
  onRemoveSavedColor: (color: string) => void;
  onHidePreset: (id: string) => void;
  onRestorePresets: () => void;
  onPatternChange: (pattern: PatternId) => void;
}

/**
 * Panel de Ajustes — puramente presentacional, sin fetch.
 * Sección Color (grid de swatches estilo Pomopopo: presets + personalizado;
 * los customs elegidos se guardan solos detrás; anillo + Check en el activo;
 * el color SOLO cambia el fondo de la web, nunca los botones) y sección
 * Decoración (patrones de glifos estilo Pomopopo).
 * Tono y espaciados iguales a ProgressPanel.
 */
export function SettingsPanel({
  themeId,
  customColor,
  savedColors,
  hiddenThemes,
  pattern,
  onPickTheme,
  onCustomColorChange,
  onRemoveSavedColor,
  onHidePreset,
  onRestorePresets,
  onPatternChange,
}: SettingsPanelProps) {
  const PATTERN_ICONS: Record<PatternId, typeof Star> = {
    none: Ban,
    stars: Star,
    circles: Circle,
    triangles: Triangle,
    flowers: Flower2,
    cups: Coffee,
    paws: PawPrint,
  };

  // El check del picker cede ante el swatch guardado del mismo color:
  // nunca hay dos checks lado a lado por el mismo color aplicado.
  const customActive =
    themeId === CUSTOM_THEME_ID &&
    !savedColors.some((c) => c.toLowerCase() === customColor.toLowerCase());
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
          El color se aplica al fondo de la web. Los personalizados se
          guardan solos al final de la fila.
        </p>
        <div
          className="mt-3 flex flex-wrap gap-3"
          role="group"
          aria-label="Elegir color de acento"
        >
          {THEMES.filter((t) => !hiddenThemes.includes(t.id)).map((theme) => {
            const active = themeId === theme.id;
            return (
              <span key={theme.id} className="relative inline-flex">
                <button
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
                {!active && (
                  <button
                    type="button"
                    onClick={() => onHidePreset(theme.id)}
                    aria-label={`Quitar color ${theme.label} de la lista`}
                    title="Quitar de la lista"
                    className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </span>
            );
          })}
          {hiddenThemes.length > 0 && (
            <button
              type="button"
              onClick={onRestorePresets}
              className="inline-flex cursor-pointer items-center gap-1.5 self-center rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Mostrar todos ({hiddenThemes.length} ocultos)
            </button>
          )}

          {/* Personalizados guardados solos: detrás de los presets, a la izquierda del picker (click aplica, × borra) */}
          {savedColors.length > 0 && (
            <span className="contents" role="group" aria-label="Colores guardados">
              {savedColors.map((hex) => {
                const active =
                  themeId === CUSTOM_THEME_ID &&
                  customColor.toLowerCase() === hex.toLowerCase();
                return (
                  <span key={hex} className="relative inline-flex">
                    <button
                      type="button"
                      onClick={() => onCustomColorChange(hex)}
                      aria-pressed={active}
                      aria-label={`Aplicar color ${hex}`}
                      title={hex}
                      style={{ backgroundColor: hex }}
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
                    <button
                      type="button"
                      onClick={() => onRemoveSavedColor(hex)}
                      aria-label={`Borrar color ${hex}`}
                      title="Borrar"
                      className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
            </span>
          )}

          {/* Color personalizado: el label abre el picker nativo. Si el custom
              actual ya está guardado, el check vive en su swatch guardado y
              acá se muestra la paleta (evita el doble check de al lado). */}
          <label
            title="Color personalizado"
            aria-label="Color personalizado"
            className={cn(
              "relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-transform duration-200 hover:scale-105 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card",
              customActive &&
                "ring-2 ring-ring ring-offset-2 ring-offset-card"
            )}
            style={{ backgroundColor: customColor }}
          >
            <span className="sr-only">Elegir color personalizado</span>
            <input
              type="color"
              value={customColor}
              aria-label="Elegir color personalizado"
              aria-pressed={customActive}
              onChange={(e) => onCustomColorChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            {customActive ? (
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

      <section aria-labelledby="settings-pattern-title">
        <h3
          id="settings-pattern-title"
          className="text-sm font-semibold tracking-tight"
        >
          Decoración
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Sumá un patrón sutil al fondo, estilo Pomopopo.
        </p>
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Elegir decoración del fondo"
        >
          {PATTERN_OPTIONS.map((option) => {
            const Icon = PATTERN_ICONS[option.id];
            const active = pattern === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onPatternChange(option.id)}
                aria-pressed={active}
                aria-label={option.label}
                title={option.label}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  active && "border-primary/60 bg-primary/5 text-primary"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {option.label}
                {active && (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
