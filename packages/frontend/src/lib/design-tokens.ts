/**
 * Design Tokens for PrismVid Design System
 * Centralized design values following design system principles
 */

export interface DesignTokens {
  colors: ColorTokens;
  glassmorphism: GlassmorphismTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  borderRadius: BorderRadiusTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
  breakpoints: BreakpointTokens;
}

export interface ColorTokens {
  primary: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;
  neutral: ColorScale;
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface GlassmorphismTokens {
  backdropBlur: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  opacity: {
    light: {
      background: string;
      border: string;
      hover: string;
    };
    dark: {
      background: string;
      border: string;
      hover: string;
    };
  };
  borderWidth: {
    thin: string;
    medium: string;
    thick: string;
  };
}

export interface TypographyTokens {
  fontFamily: {
    sans: string[];
    mono: string[];
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface BorderRadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}

export interface TransitionTokens {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  timing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface BreakpointTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

/**
 * Light Theme Design Tokens
 */
export const lightTheme: DesignTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },
    info: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95'
    },
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b'
    }
  },
  glassmorphism: {
    backdropBlur: {
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px'
    },
    opacity: {
      light: {
        background: 'rgba(255, 255, 255, 0.95)',
        border: 'rgba(0, 0, 0, 0.1)',
        hover: 'rgba(255, 255, 255, 0.98)'
      },
      dark: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
        hover: 'rgba(255, 255, 255, 0.15)'
      }
    },
    borderWidth: {
      thin: '1px',
      medium: '2px',
      thick: '3px'
    }
  },
  typography: {
    fontFamily: {
      sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['Menlo', 'Monaco', 'Consolas', 'monospace']
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem'
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '1rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none'
  },
  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms'
    },
    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

/**
 * Dark Theme Design Tokens
 */
export const darkTheme: DesignTokens = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    neutral: {
      50: '#18181b',
      100: '#27272a',
      200: '#3f3f46',
      300: '#52525b',
      400: '#71717a',
      500: '#a1a1aa',
      600: '#d4d4d8',
      700: '#e4e4e7',
      800: '#f4f4f5',
      900: '#fafafa'
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
    none: 'none'
  }
};

/**
 * Default theme (dark-first approach)
 */
export const defaultTheme = darkTheme;

/**
 * Get theme-specific tokens
 */
export function getThemeTokens(theme: 'light' | 'dark' = 'dark'): DesignTokens {
  return theme === 'light' ? lightTheme : darkTheme;
}

/**
 * Chip color variants based on design tokens
 */
export const chipColors = {
  default: darkTheme.colors.neutral,
  primary: darkTheme.colors.primary,
  success: darkTheme.colors.success,
  warning: darkTheme.colors.warning,
  error: darkTheme.colors.error,
  info: darkTheme.colors.info
} as const;

