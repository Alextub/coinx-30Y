import { useEffect } from 'react';
import { useSocket } from './useSocket';

export function useTheme() {
  const { gameState: gs } = useSocket();

  useEffect(() => {
    if (!gs?.themes || !gs?.activeThemeId) return;
    const theme = gs.themes.find(t => t.id === gs.activeThemeId);
    if (!theme?.cssVars) return;
    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
  }, [gs?.themes, gs?.activeThemeId]);

  const activeTheme = gs?.themes?.find(t => t.id === gs?.activeThemeId);
  return activeTheme ?? null;
}
