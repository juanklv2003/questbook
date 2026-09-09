import * as React from "react";
import {
  applyTheme,
  getTheme,
  loadBackground,
  loadTheme,
  saveBackground,
  saveTheme,
  BG_CHANGE_EVENT,
  type BackgroundMode,
} from "../lib/theme";

export interface ThemeSettings {
  themeId: string;
  customColor: string;
  background: BackgroundMode;
  pickTheme: (id: string) => void;
  changeCustomColor: (color: string) => void;
  changeBackground: (mode: BackgroundMode) => void;
}

/**
 * Estado de ajustes reactivo, compartido por App (renderiza el fondo) y
 * DeckDashboardContainer (drawer de Ajustes). El color se aplica directo al
 * DOM (`applyTheme`); el fondo se sincroniza entre instancias vía evento
 * `andel:bg-change` porque App y el drawer viven en ramas distintas.
 */
export function useThemeSettings(): ThemeSettings {
  const [persisted, setPersisted] = React.useState(loadTheme);
  const [background, setBackground] = React.useState<BackgroundMode>(loadBackground);

  // Re-aplica por si el módulo se importó tarde (HMR, tests).
  React.useEffect(() => {
    const theme = getTheme(persisted.id, persisted.custom);
    applyTheme(theme.brand, theme.dark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza el fondo si otra instancia (el drawer) lo cambia.
  React.useEffect(() => {
    const onChange = () => setBackground(loadBackground());
    window.addEventListener(BG_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(BG_CHANGE_EVENT, onChange);
  }, []);

  const pickTheme = React.useCallback(
    (id: string) => {
      const next = { id, custom: persisted.custom };
      saveTheme(next);
      const theme = getTheme(id, next.custom);
      applyTheme(theme.brand, theme.dark);
      setPersisted(next);
    },
    [persisted.custom]
  );

  const changeCustomColor = React.useCallback(
    (color: string) => {
      const next = { id: "custom", custom: color };
      saveTheme(next);
      const theme = getTheme("custom", color);
      applyTheme(theme.brand, theme.dark);
      setPersisted(next);
    },
    []
  );

  const changeBackground = React.useCallback((mode: BackgroundMode) => {
    saveBackground(mode);
    setBackground(mode);
  }, []);

  return {
    themeId: persisted.id,
    customColor: persisted.custom,
    background,
    pickTheme,
    changeCustomColor,
    changeBackground,
  };
}
