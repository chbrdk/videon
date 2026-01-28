/**
 * VIDEON Design Tokens
 * Based on MSQDX Design System
 * Centralized design values following design system principles
 */

// Import MSQDX Design System Tokens
// Use inline definitions based on ECHON design-tokens.ts
export const MSQDX_COLORS = {
  brand: {
    purple: "#b638ff",
    yellow: "#fef14d",
    pink: "#f256b6",
    orange: "#ff6a3b",
    blue: "#3b82f6",
    green: "#00ca55",
    greenRgb: "0, 202, 85",
    orangeRgb: "255, 106, 59",
    white: "#ffffff",
    black: "#000000",
  },
  tints: {
    purple: "rgba(182, 56, 255, 0.15)",
    yellow: "rgba(254, 241, 77, 0.15)",
    pink: "rgba(242, 86, 182, 0.15)",
    orange: "rgba(255, 106, 59, 0.15)",
    blue: "rgba(59, 130, 246, 0.15)",
    green: "rgba(0, 202, 85, 0.15)",
  },
  status: {
    success: "#22c55e",
    warning: "#f97316",
    error: "#f87171",
    info: "#3b82f6",
  },
  dark: {
    background: "#0f0f0f",
    paper: "#1a1a1a",
    border: "rgba(255, 255, 255, 0.12)",
    textPrimary: "#ffffff",
    textSecondary: "#cccccc",
  },
  light: {
    background: "#f8f6f0",
    paper: "#ffffff",
    border: "rgba(0, 0, 0, 0.12)",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
  }
};

export const MSQDX_SPACING = {
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    full: 999,
  },
  scale: {
    none: 0,
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  }
};

export const MSQDX_EFFECTS = {
  glass: {
    blur: "12px",
    saturate: "150%",
  },
  shadows: {
    light: "none",
    dark: "none",
  },
  transitions: {
    fast: "0.15s ease-out",
    standard: "0.2s ease-in-out",
    slow: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
};

export const MSQDX_TYPOGRAPHY = {
  fontFamily: {
    primary: '"Noto Sans JP", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  fontSize: {
    xs: "0.625rem",
    sm: "0.75rem",
    body2: "0.8125rem",
    body1: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "2rem",
    "4xl": "2.5rem",
  },
  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

// MSQDX_RESPONSIVE - based on ECHON design-tokens.ts
export const MSQDX_RESPONSIVE = {
  cardRadius: {
    xs: MSQDX_SPACING.borderRadius.md,   // 16px
    sm: MSQDX_SPACING.borderRadius.lg,   // 24px
    md: MSQDX_SPACING.borderRadius.xl,   // 32px
  },
  sectionPadding: {
    xs: MSQDX_SPACING.scale.lg,   // 24px
    md: MSQDX_SPACING.scale.xxl,  // 48px
  },
  gap: {
    xs: 2,
    md: 3,
  },
  outerShell: {
    radius: MSQDX_SPACING.borderRadius.xxl, // 40px
    border: {
      xs: 8,
      md: 10,
    }
  },
  fontScale: {
    xs: 1,
    md: 1.1,
  }
};

// MSQDX_ICONS - based on ECHON design-tokens.ts
export const MSQDX_ICONS = {
  sizes: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  weights: {
    light: 200,
    thin: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

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
  brand: typeof MSQDX_COLORS.brand;
  tints: typeof MSQDX_COLORS.tints;
  status: typeof MSQDX_COLORS.status;
  dark: typeof MSQDX_COLORS.dark;
  light: typeof MSQDX_COLORS.light;
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
  fontFamily: typeof MSQDX_TYPOGRAPHY.fontFamily;
  fontSize: typeof MSQDX_TYPOGRAPHY.fontSize;
  fontWeight: typeof MSQDX_TYPOGRAPHY.fontWeight;
  lineHeight: typeof MSQDX_TYPOGRAPHY.lineHeight;
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
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  full: string;
}

export interface ShadowTokens {
  light: string;
  dark: string;
}

export interface TransitionTokens {
  fast: string;
  standard: string;
  slow: string;
  spring: string;
}

export interface BreakpointTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

/**
 * Light Theme Design Tokens (MSQDX-based)
 */
export const lightTheme: DesignTokens = {
  colors: {
    brand: MSQDX_COLORS.brand,
    tints: MSQDX_COLORS.tints,
    status: MSQDX_COLORS.status,
    dark: MSQDX_COLORS.dark,
    light: MSQDX_COLORS.light,
  },
  glassmorphism: {
    backdropBlur: {
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: MSQDX_EFFECTS.glass.blur, // 12px
      xl: '16px',
    },
    opacity: {
      light: {
        background: 'rgba(255, 255, 255, 0.95)',
        border: MSQDX_COLORS.light.border,
        hover: 'rgba(255, 255, 255, 0.98)',
      },
      dark: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: MSQDX_COLORS.dark.border,
        hover: 'rgba(255, 255, 255, 0.15)',
      },
    },
    borderWidth: {
      thin: '1px',
      medium: '2px',
      thick: '3px',
    },
  },
  typography: {
    fontFamily: MSQDX_TYPOGRAPHY.fontFamily,
    fontSize: MSQDX_TYPOGRAPHY.fontSize,
    fontWeight: MSQDX_TYPOGRAPHY.fontWeight,
    lineHeight: MSQDX_TYPOGRAPHY.lineHeight,
  },
  spacing: {
    xs: `${MSQDX_SPACING.scale.xxs}px`, // 4px
    sm: `${MSQDX_SPACING.scale.xs}px`, // 8px
    md: `${MSQDX_SPACING.scale.md}px`, // 16px
    lg: `${MSQDX_SPACING.scale.lg}px`, // 24px
    xl: `${MSQDX_SPACING.scale.xl}px`, // 32px
    '2xl': `${MSQDX_SPACING.scale.xxl}px`, // 48px
    '3xl': `${MSQDX_SPACING.scale.xxxl}px`, // 64px
    '4xl': '96px',
  },
  borderRadius: {
    none: `${MSQDX_SPACING.borderRadius.none}px`,
    xs: `${MSQDX_SPACING.borderRadius.xs}px`, // 4px
    sm: `${MSQDX_SPACING.borderRadius.sm}px`, // 8px
    md: `${MSQDX_SPACING.borderRadius.md}px`, // 16px
    lg: `${MSQDX_SPACING.borderRadius.lg}px`, // 24px
    xl: `${MSQDX_SPACING.borderRadius.xl}px`, // 32px
    xxl: `${MSQDX_SPACING.borderRadius.xxl}px`, // 40px
    full: `${MSQDX_SPACING.borderRadius.full}px`, // 999px
  },
  shadows: {
    light: MSQDX_EFFECTS.shadows.light,
    dark: MSQDX_EFFECTS.shadows.dark,
  },
  transitions: {
    fast: MSQDX_EFFECTS.transitions.fast,
    standard: MSQDX_EFFECTS.transitions.standard,
    slow: MSQDX_EFFECTS.transitions.slow,
    spring: MSQDX_EFFECTS.transitions.spring,
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

/**
 * Dark Theme Design Tokens (MSQDX-based)
 */
export const darkTheme: DesignTokens = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    // Dark theme uses same color palette but different semantic usage
  },
  shadows: {
    light: 'none',
    dark: 'none',
  },
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
 * Chip color variants based on MSQDX brand colors
 */
export const chipColors = {
  default: {
    50: MSQDX_COLORS.dark.paper,
    100: MSQDX_COLORS.dark.border,
    200: MSQDX_COLORS.dark.textSecondary,
    300: MSQDX_COLORS.dark.textSecondary,
    400: MSQDX_COLORS.dark.textSecondary,
    500: MSQDX_COLORS.dark.textSecondary,
    600: MSQDX_COLORS.dark.textPrimary,
    700: MSQDX_COLORS.dark.textPrimary,
    800: MSQDX_COLORS.dark.textPrimary,
    900: MSQDX_COLORS.dark.textPrimary,
  },
  primary: {
    50: MSQDX_COLORS.tints.blue,
    100: MSQDX_COLORS.tints.blue,
    200: MSQDX_COLORS.tints.blue,
    300: MSQDX_COLORS.tints.blue,
    400: MSQDX_COLORS.tints.blue,
    500: MSQDX_COLORS.brand.blue,
    600: MSQDX_COLORS.brand.blue,
    700: MSQDX_COLORS.brand.blue,
    800: MSQDX_COLORS.brand.blue,
    900: MSQDX_COLORS.brand.blue,
  },
  success: {
    50: MSQDX_COLORS.tints.green,
    100: MSQDX_COLORS.tints.green,
    200: MSQDX_COLORS.tints.green,
    300: MSQDX_COLORS.tints.green,
    400: MSQDX_COLORS.tints.green,
    500: MSQDX_COLORS.status.success,
    600: MSQDX_COLORS.status.success,
    700: MSQDX_COLORS.status.success,
    800: MSQDX_COLORS.status.success,
    900: MSQDX_COLORS.status.success,
  },
  warning: {
    50: MSQDX_COLORS.tints.orange,
    100: MSQDX_COLORS.tints.orange,
    200: MSQDX_COLORS.tints.orange,
    300: MSQDX_COLORS.tints.orange,
    400: MSQDX_COLORS.tints.orange,
    500: MSQDX_COLORS.status.warning,
    600: MSQDX_COLORS.status.warning,
    700: MSQDX_COLORS.status.warning,
    800: MSQDX_COLORS.status.warning,
    900: MSQDX_COLORS.status.warning,
  },
  error: {
    50: MSQDX_COLORS.tints.pink,
    100: MSQDX_COLORS.tints.pink,
    200: MSQDX_COLORS.tints.pink,
    300: MSQDX_COLORS.tints.pink,
    400: MSQDX_COLORS.tints.pink,
    500: MSQDX_COLORS.status.error,
    600: MSQDX_COLORS.status.error,
    700: MSQDX_COLORS.status.error,
    800: MSQDX_COLORS.status.error,
    900: MSQDX_COLORS.status.error,
  },
  info: {
    50: MSQDX_COLORS.tints.purple,
    100: MSQDX_COLORS.tints.purple,
    200: MSQDX_COLORS.tints.purple,
    300: MSQDX_COLORS.tints.purple,
    400: MSQDX_COLORS.tints.purple,
    500: MSQDX_COLORS.brand.purple,
    600: MSQDX_COLORS.brand.purple,
    700: MSQDX_COLORS.brand.purple,
    800: MSQDX_COLORS.brand.purple,
    900: MSQDX_COLORS.brand.purple,
  },
} as const;
