export type ThemeOption = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'vet-crm-theme';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

export function resolveTheme(theme: ThemeOption): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

