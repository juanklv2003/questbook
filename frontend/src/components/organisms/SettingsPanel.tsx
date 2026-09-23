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
import { LanguageSwitch } from "../atoms/LanguageSwitch";
import { StudyModeSwitch } from "../molecules/StudyModeSwitch";
import { useLanguage } from "../../i18n/LanguageContext";
import type { StudyMode } from "../../lib/studyMode";

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
  studyMode: StudyMode;
  onStudyModeChange: (mode: StudyMode) => void;
}

/**
 * Settings panel — purely presentational, no fetching.
 * Language section (persisted ES|EN pill) + Color section (Pomopopo-style
 * swatch grid: presets + custom; chosen customs self-save behind the scenes;
 * ring + Check on the active one; color ONLY changes the website background,
 * never buttons) + Decoration section (Pomopopo-style glyph patterns).
 * Tone and spacing match ProgressPanel.
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
  studyMode,
  onStudyModeChange,
}: SettingsPanelProps) {
  const { t } = useLanguage();
  const PATTERN_ICONS: Record<PatternId, typeof Star> = {
    none: Ban,
    stars: Star,
    circles: Circle,
    triangles: Triangle,
    flowers: Flower2,
    cups: Coffee,
    paws: PawPrint,
  };

  // The picker check yields to the saved swatch of the same color:
  // never two side-by-side checks for the same applied color.
  const customActive =
    themeId === CUSTOM_THEME_ID &&
    !savedColors.some((c) => c.toLowerCase() === customColor.toLowerCase());
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="settings-study-mode-title">
        <h3
          id="settings-study-mode-title"
          className="text-sm font-semibold tracking-tight"
        >
          {t("settings.studyModeTitle")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {t("settings.studyModeDescription")}
        </p>
        <div className="mt-3">
          <StudyModeSwitch mode={studyMode} onChange={onStudyModeChange} />
        </div>
      </section>

      <section aria-labelledby="settings-language-title">
        <h3
          id="settings-language-title"
          className="text-sm font-semibold tracking-tight"
        >
          {t("settings.languageTitle")}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {t("settings.languageDescription")}
        </p>
        <div className="mt-3">
          <LanguageSwitch variant="full" />
        </div>
      </section>

      <section aria-labelledby="settings-color-title">
        <h3
          id="settings-color-title"
          className="text-sm font-semibold tracking-tight"
        >
          {t("settings.colorTitle")}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {t("settings.colorDesc")}
        </p>
        <div
          className="mt-3 flex flex-wrap gap-3"
          role="group"
          aria-label={t("settings.chooseAccent")}
        >
          {THEMES.filter((t) => !hiddenThemes.includes(t.id)).map((theme) => {
            const active = themeId === theme.id;
            const themeLabel = t(theme.labelKey);
            return (
              <span key={theme.id} className="relative inline-flex">
                <button
                  type="button"
                  onClick={() => onPickTheme(theme.id)}
                  aria-pressed={active}
                  aria-label={t("up.colorOption", { label: themeLabel })}
                  title={themeLabel}
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
                    aria-label={t("settings.removeColor", { label: themeLabel })}
                    title={t("settings.removeFromList")}
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
              {t("settings.showAll", { count: hiddenThemes.length })}
            </button>
          )}

          {/* Self-saved customs: behind presets, left of the picker (click applies, × removes) */}
          {savedColors.length > 0 && (
            <span className="contents" role="group" aria-label={t("settings.savedColors")}>
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
                      aria-label={t("settings.applyColor", { hex })}
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
                      aria-label={t("settings.deleteColor", { hex })}
                      title={t("settings.delete")}
                      className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
            </span>
          )}

          {/* Custom color: the label opens the native picker. When the current
              custom is already saved, the check lives on its saved swatch and
              the palette shows here (avoids the side-by-side double check). */}
          <label
            title={t("settings.customColor")}
            aria-label={t("settings.customColor")}
            className={cn(
              "relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-transform duration-200 hover:scale-105 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card",
              customActive &&
                "ring-2 ring-ring ring-offset-2 ring-offset-card"
            )}
            style={{ backgroundColor: customColor }}
          >
            <span className="sr-only">{t("settings.chooseCustom")}</span>
            <input
              type="color"
              value={customColor}
              aria-label={t("settings.chooseCustom")}
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
          {t("settings.decorationTitle")}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {t("settings.decorationDesc")}
        </p>
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label={t("settings.chooseDecoration")}
        >
          {PATTERN_OPTIONS.map((option) => {
            const Icon = PATTERN_ICONS[option.id];
            const active = pattern === option.id;
            const optionLabel = t(option.labelKey);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onPatternChange(option.id)}
                aria-pressed={active}
                aria-label={optionLabel}
                title={optionLabel}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  active && "border-primary/60 bg-primary/5 text-primary"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {optionLabel}
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
