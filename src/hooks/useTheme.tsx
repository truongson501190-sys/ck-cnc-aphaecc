// src/hooks/useTheme.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================
// TYPES
// ============================================================
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor = 'blue' | 'indigo' | 'purple' | 'green' | 'red' | 'orange' | 'yellow' | 'pink';

export interface ThemeConfig {
  mode: ThemeMode;
  color: ThemeColor;
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
}

// ============================================================
// STORAGE KEYS
// ============================================================
const STORAGE_KEYS = {
  THEME: 'theme',
  COLOR: 'theme-color',
  FONT_SIZE: 'theme-font-size',
  DENSITY: 'theme-density',
} as const;

// ============================================================
// DEFAULT CONFIG
// ============================================================
const DEFAULT_CONFIG: ThemeConfig = {
  mode: 'light',
  color: 'blue',
  fontSize: 'medium',
  density: 'comfortable',
};

// ============================================================
// COLOR MAPS
// ============================================================
const COLOR_MAP: Record<ThemeColor, { light: string; dark: string }> = {
  blue: { light: '#3b82f6', dark: '#60a5fa' },
  indigo: { light: '#6366f1', dark: '#818cf8' },
  purple: { light: '#8b5cf6', dark: '#a78bfa' },
  green: { light: '#22c55e', dark: '#4ade80' },
  red: { light: '#ef4444', dark: '#f87171' },
  orange: { light: '#f59e0b', dark: '#fbbf24' },
  yellow: { light: '#eab308', dark: '#facc15' },
  pink: { light: '#ec4899', dark: '#f472b6' },
};

const COLOR_CLASSES: Record<ThemeColor, string> = {
  blue: 'blue',
  indigo: 'indigo',
  purple: 'purple',
  green: 'green',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  pink: 'pink',
};

const getInitialThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(STORAGE_KEYS.THEME);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  const rootDark = document.documentElement.classList.contains('dark');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return rootDark || systemDark ? 'dark' : 'light';
};

const saveConfig = (config: ThemeConfig) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEYS.THEME, config.mode);
    window.localStorage.setItem(STORAGE_KEYS.COLOR, config.color);
    window.localStorage.setItem(STORAGE_KEYS.FONT_SIZE, config.fontSize);
    window.localStorage.setItem(STORAGE_KEYS.DENSITY, config.density);
  } catch {
    // Ignore storage access failures in restricted environments.
  }
};

// ============================================================
// HOOK
// ============================================================
export const useTheme = () => {
  // --- State ---
  const [config, setConfig] = useState<ThemeConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;

    try {
      const storedMode = getInitialThemeMode();
      const storedColor = window.localStorage.getItem(STORAGE_KEYS.COLOR) as ThemeColor | null;
      const storedFontSize = window.localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as ThemeConfig['fontSize'] | null;
      const storedDensity = window.localStorage.getItem(STORAGE_KEYS.DENSITY) as ThemeConfig['density'] | null;

      return {
        mode: storedMode,
        color: storedColor || DEFAULT_CONFIG.color,
        fontSize: storedFontSize || DEFAULT_CONFIG.fontSize,
        density: storedDensity || DEFAULT_CONFIG.density,
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // --- Derived state ---
  const isDark = useMemo(() => {
    if (config.mode === 'system') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return config.mode === 'dark';
  }, [config.mode]);

  const currentColor = useMemo(() => {
    return COLOR_MAP[config.color];
  }, [config.color]);

  const colorClass = useMemo(() => {
    return COLOR_CLASSES[config.color];
  }, [config.color]);

  // --- Effects ---
  // Apply theme to document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.style.setProperty('--theme-primary', isDark ? currentColor.dark : currentColor.light);
    root.style.setProperty('--theme-primary-rgb', isDark ? '96, 165, 250' : '59, 130, 246');
    root.dataset.themeColor = colorClass;

    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.fontSize = fontSizeMap[config.fontSize];

    const densityMap = {
      compact: '0.75',
      comfortable: '1',
      spacious: '1.25',
    };
    root.style.setProperty('--theme-density', densityMap[config.density]);

    saveConfig(config);
    setIsLoaded(true);
  }, [config, isDark, currentColor, colorClass]);

  // Listen to system theme changes
  useEffect(() => {
    if (config.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setConfig(prev => ({ ...prev }));
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [config.mode]);

  // --- Actions ---
  const setTheme = useCallback((mode: ThemeMode) => {
    setConfig(prev => ({ ...prev, mode }));
  }, []);

  const toggleTheme = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      mode: prev.mode === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const setColor = useCallback((color: ThemeColor) => {
    setConfig(prev => ({ ...prev, color }));
  }, []);

  const setFontSize = useCallback((fontSize: ThemeConfig['fontSize']) => {
    setConfig(prev => ({ ...prev, fontSize }));
  }, []);

  const setDensity = useCallback((density: ThemeConfig['density']) => {
    setConfig(prev => ({ ...prev, density }));
  }, []);

  const resetTheme = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  // --- Getters ---
  const getThemeIcon = useCallback(() => {
    if (config.mode === 'system') return '💻';
    if (config.mode === 'dark') return '🌙';
    return '☀️';
  }, [config.mode]);

  const getThemeLabel = useCallback(() => {
    if (config.mode === 'system') return 'Hệ thống';
    if (config.mode === 'dark') return 'Tối';
    return 'Sáng';
  }, [config.mode]);

  // --- System preference ---
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    // State
    config,
    theme: config.mode, // Thêm theme alias cho dễ sử dụng
    isDark,
    isLoaded,
    currentColor,
    colorClass,
    prefersDark,

    // Actions
    setTheme,
    toggleTheme,
    setColor,
    setFontSize,
    setDensity,
    resetTheme,

    // Getters
    getThemeIcon,
    getThemeLabel,

    // Helpers
    isLight: !isDark,
    mode: config.mode,
    color: config.color,
    fontSize: config.fontSize,
    density: config.density,
  };
};

// ============================================================
// HOOK: useThemeColor
// ============================================================
export const useThemeColor = () => {
  const { color, isDark, currentColor } = useTheme();
  return {
    color,
    isDark,
    currentColor,
    getColor: (shade: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950) => {
      return `var(--color-${COLOR_CLASSES[color]}-${shade})`;
    },
  };
};

// ============================================================
// HOOK: useThemeClass
// ============================================================
export const useThemeClass = () => {
  const { colorClass, isDark } = useTheme();
  return {
    colorClass,
    isDark,
    getClass: (type: 'bg' | 'text' | 'border' | 'ring', shade?: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950) => {
      const base = `${type}-${colorClass}`;
      if (!shade) return base;
      return `${base}-${shade}`;
    },
  };
};