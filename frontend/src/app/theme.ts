import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'drone-monitoring-theme';
export const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

export function readSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
