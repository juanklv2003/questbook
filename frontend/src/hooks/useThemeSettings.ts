import * as React from "react";
import {
  addSavedColor,
  applyTheme,
  getTheme,
  hideTheme,
  loadBackground,
  loadPattern,
  loadTheme,
  removeSavedColor,
  restoreThemes,
  saveBackground,
  savePattern,
  saveTheme,
  BG_CHANGE_EVENT,
  PATTERN_CHANGE_EVENT,
  type BackgroundMode,
  type PatternId,
} from "../lib/theme";

export interface ThemeSettings {
  themeId: string;
  customColor: string;
  savedColors: string[];
  hiddenThemes: string[];
  background: BackgroundMode;
  pattern: PatternId;
  pickTheme: (id: string) => void;
  changeCustomColor: (color: string) => void;
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
  hidePreset: (id: string) => void;
  restorePresets: () => void;
  changeBackground: (mode: BackgroundMode) => void;
  changePattern: (pattern: PatternId) => void;
}

/**
 * Estado de ajustes reactivo, compartido por App (renderiza el fondo y la
 * decoración) y DeckDashboardContainer (drawer de Ajustes). El color se
 * aplica directo al DOM (`applyTheme`); el fondo y el patrón se sincronizan
 * entre instancias vía eventos porque App y el drawer viven en ramas
 * distintas.
 */
export function useThemeSettings(): ThemeSettings {
  const [persisted, setPersisted] = React.useState(loadTheme);
  const [background, setBackground] = React.useState<BackgroundMode>(loadBackground);
  const [pattern, setPattern] = React.useState<PatternId>(loadPattern);

  // Re-aplica por si el módulo se importó tarde (HMR, tests).
  React.useEffect(() => {
    const theme = getTheme(persisted.id, persisted.custom);
    applyTheme(theme.brand, theme.dark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza fondo y patrón si otra instancia (el drawer) los cambia.
  React.useEffect(() => {
    const onBgChange = () => setBackground(loadBackground());
    const onPatternChange = () => setPattern(loadPattern());
    window.addEventListener(BG_CHANGE_EVENT, onBgChange);
    window.addEventListener(PATTERN_CHANGE_EVENT, onPatternChange);
    return () => {
      window.removeEventListener(BG_CHANGE_EVENT, onBgChange);
      window.removeEventListener(PATTERN_CHANGE_EVENT, onPatternChange);
    };
  }, []);

  const pickTheme = React.useCallback((id: string) => {
    setPersisted((prev) => {
      const next = { ...prev, id };
      saveTheme(next);
      const theme = getTheme(id, next.custom);
      applyTheme(theme.brand, theme.dark);
      return next;
    });
  }, []);

  const changeCustomColor = React.useCallback((color: string) => {
    setPersisted((prev) => {
      const next = { ...prev, id: "custom", custom: color };
      saveTheme(next);
      const theme = getTheme("custom", color);
      applyTheme(theme.brand, theme.dark);
      return next;
    });
  }, []);

  const addColor = React.useCallback((color: string) => {
    const savedColors = addSavedColor(color);
    setPersisted((prev) => ({ ...prev, savedColors }));
  }, []);

  const removeColor = React.useCallback((color: string) => {
    const savedColors = removeSavedColor(color);
    setPersisted((prev) => ({ ...prev, savedColors }));
  }, []);

  const hidePreset = React.useCallback((id: string) => {
    const hiddenThemes = hideTheme(id);
    setPersisted((prev) => ({ ...prev, hiddenThemes }));
  }, []);

  const restorePresets = React.useCallback(() => {
    const hiddenThemes = restoreThemes();
    setPersisted((prev) => ({ ...prev, hiddenThemes }));
  }, []);

  const changeBackground = React.useCallback((mode: BackgroundMode) => {
    saveBackground(mode);
    setBackground(mode);
  }, []);

  const changePattern = React.useCallback((pattern: PatternId) => {
    savePattern(pattern);
    setPattern(pattern);
  }, []);

  return {
    themeId: persisted.id,
    customColor: persisted.custom,
    savedColors: persisted.savedColors,
    hiddenThemes: persisted.hiddenThemes,
    background,
    pattern,
    pickTheme,
    changeCustomColor,
    addColor,
    removeColor,
    hidePreset,
    restorePresets,
    changeBackground,
    changePattern,
  };
}
