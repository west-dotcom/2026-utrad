import { useState, useEffect, useCallback } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'crypto_bot_theme_preference';

/**
 * Helper to determine system preference
 */
function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Apply theme classes and attributes to <html>
 */
function applyTheme(preference: ThemePreference): ResolvedTheme {
  if (typeof document === 'undefined') return 'dark';

  const root = document.documentElement;
  const systemTheme = getSystemPreference();
  const resolved: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }

  root.setAttribute('data-theme', preference);
  root.setAttribute('data-resolved-theme', resolved);

  return resolved;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read theme preference from storage', e);
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return applyTheme(theme);
  });

  // Apply theme on mount and whenever theme changes
  useEffect(() => {
    const active = applyTheme(theme);
    setResolvedTheme(active);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  }, [theme]);

  // Listen to OS system color-scheme changes if current preference is 'system'
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const active = applyTheme('system');
        setResolvedTheme(active);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleChange);
      return () => (mediaQuery as any).removeListener(handleChange);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
  };
}
