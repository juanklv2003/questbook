import * as React from "react";
import {
  Ban,
  Check,
  Circle,
  Coffee,
  Flower2,
  PaintBucket,
  Palette,
  PawPrint,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  TreePine,
  Triangle,
  X,
} from "lucide-react";
import {
  BACKGROUND_OPTIONS,
  CUSTOM_THEME_ID,
  PATTERN_OPTIONS,
  THEMES,
  type BackgroundMode,
  type PatternId,
} from "../../lib/theme";
import { cn } from "../../lib/utils";

export interface SettingsPanelProps {
  themeId: string;
  customColor: string;
  savedColors: string[];
  hiddenThemes: string[];
  background: BackgroundMode;
  pattern: PatternId;
  onPickTheme: (id: string) => void;
  onCustomColorChange: (color: string) => void;
  onAddSavedColor: (color: string) => void;
  onRemoveSavedColor: (color: string) => void;
  onHidePreset: (id: string) => void;
  onRestorePresets: () => void;
  onBackgroundChange: (mode: BackgroundMode) => void;
  onPatternChange: (pattern: PatternId) => void;
}

const BG_ICONS: Record<BackgroundMode, typeof TreePine> = {
  bosque: TreePine,
  resplandor: Sparkles,
  color: PaintBucket,
};

const PATTERN_ICONS: Record<PatternId, typeof Star> = {
  none: Ban,
  stars: Star,
  circles: Circle,
  triangles: Triangle,
  flowers: Flower2,
  cups: Coffee,
  paws: PawPrint,
};

/**
 * Panel de Ajustes — puramente presentacional, sin fetch.
 * Sección Color (grid de swatches estilo Pomopopo: presets + personalizado +
 * "Mis colores" guardados, anillo + Check en el activo; el color SOLO cambia
 * el fondo de la web, nunca los botones), sección Fondo (tres opciones reales
 * y persistidas: bosque / resplandor / color) y sección Decoración (patrones
 * de glifos estilo Pomopopo). Tono y espaciados iguales a ProgressPanel.
 */
export function SettingsPanel({
  themeId,
  customColor,
  savedColors,
  hiddenThemes,
  background,
  pattern,
  onPickTheme,
  onCustomColorChange,
  onAddSavedColor,
  onRemoveSavedColor,
  onHidePreset,
  onRestorePresets,
  onBackgroundChange,
  onPatternChange,
}: SettingsPanelProps) {
  // Borrador del picker de "Mis colores": arranca en el custom actual para
  // que Guardar añada lo que se ve, sin pisar el color aplicado hasta guardar.
  const [draft, setDraft] = React.useState(customColor);
  // Si el custom cambia desde el picker de arriba, el borrador lo sigue:
  // Guardar añade siempre el color visible, nunca uno viejo.
  React.useEffect(() => {
    setDraft(customColor);
  }, [customColor]);
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

        {/* Mis colores: guardados estilo Pomopopo (click aplica, × borra) */}
        <h4 className="mt-4 text-xs font-semibold tracking-tight">
          Mis colores
        </h4>
        <div className="mt-2 flex items-center gap-2">
          <label
            className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border"
            style={{ backgroundColor: draft }}
            title="Elegir color para guardar"
          >
            <span className="sr-only">Elegir color para guardar</span>
            <input
              type="color"
              value={draft}
              aria-label="Elegir color para guardar"
              onChange={(e) => setDraft(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onAddSavedColor(draft);
              setDraft(customColor);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Guardar
          </button>
        </div>
        {savedColors.length > 0 ? (
          <div
            className="mt-3 flex flex-wrap gap-3"
            role="group"
            aria-label="Colores guardados"
          >
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
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Todavía no guardaste colores. Elegí uno y tocá Guardar.
          </p>
        )}
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
