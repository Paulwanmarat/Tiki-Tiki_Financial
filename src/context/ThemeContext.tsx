import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { Colors, ThemeColors } from '@/constants/theme';
import { getTokenSafe, setTokenSafe } from '@/utils/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  systemTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const THEME_STORAGE_KEY = 'spr_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.dark,
  isDark: true,
  themeMode: 'system',
  systemTheme: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {},
  cycleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [browserDark, setBrowserDark] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch {
        return deviceColorScheme === 'dark';
      }
    }
    return deviceColorScheme === 'dark';
  });

  // Listen to browser/system media query changes on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      try {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setBrowserDark(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
          setBrowserDark(e.matches);
        };

        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
        } else if ((mediaQuery as any).addListener) {
          (mediaQuery as any).addListener(handleChange);
          return () => (mediaQuery as any).removeListener(handleChange);
        }
      } catch (e) {
        console.warn('Media query listener setup failed:', e);
      }
    }
  }, []);

  // Load saved theme preference on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await getTokenSafe(THEME_STORAGE_KEY);
        if (isMounted && saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (err) {
        console.warn('Failed to load saved theme mode:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Set theme mode and persist
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setTokenSafe(THEME_STORAGE_KEY, mode).catch((err) => {
      console.warn('Failed to save theme mode:', err);
    });
  }, []);

  // System detected theme
  const systemTheme: 'light' | 'dark' = useMemo(() => {
    if (Platform.OS === 'web') {
      return browserDark ? 'dark' : 'light';
    }
    return deviceColorScheme === 'dark' ? 'dark' : 'light';
  }, [browserDark, deviceColorScheme]);

  // Resolved active dark flag
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemTheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemTheme]);

  // Synchronize document elements on web for scrollbars, inputs & body background
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
        if (document.body) {
          document.body.style.backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
        }
      } catch {}
    }
  }, [isDark]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  // Cycle through system -> light -> dark -> system
  const cycleTheme = useCallback(() => {
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  }, [themeMode, setThemeMode]);

  const value = useMemo(
    () => ({
      colors: isDark ? Colors.dark : Colors.light,
      isDark,
      themeMode,
      systemTheme,
      setThemeMode,
      toggleTheme,
      cycleTheme,
    }),
    [isDark, themeMode, systemTheme, setThemeMode, toggleTheme, cycleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
