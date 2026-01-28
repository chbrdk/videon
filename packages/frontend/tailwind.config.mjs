/** @type {import('tailwindcss').Config} */
// Try to import from relative path (for Docker build) or parent directory (for local build)
// Try to import from relative path (for Docker build) or parent directory (for local build)
let MSQDX_COLORS, MSQDX_TYPOGRAPHY, MSQDX_SPACING, MSQDX_EFFECTS;

// Fallback tokens (copied from src/lib/design-tokens.ts) to ensure build succeeds even if submodule is missing
const FALLBACK_TOKENS = {
  MSQDX_COLORS: {
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
  },
  MSQDX_SPACING: {
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
  },
  MSQDX_EFFECTS: {
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
  },
  MSQDX_TYPOGRAPHY: {
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
  }
};

try {
  // First try Docker build path
  const tokens = require('./msqdx-design-system/packages/design-system/src/tokens/index.ts');
  MSQDX_COLORS = tokens.MSQDX_COLORS;
  MSQDX_TYPOGRAPHY = tokens.MSQDX_TYPOGRAPHY;
  MSQDX_SPACING = tokens.MSQDX_SPACING;
  MSQDX_EFFECTS = tokens.MSQDX_EFFECTS;
} catch (e) {
  try {
    // Then try local dev path (parent directory)
    const tokens = require('../msqdx-design-system/packages/design-system/src/tokens/index.ts');
    MSQDX_COLORS = tokens.MSQDX_COLORS;
    MSQDX_TYPOGRAPHY = tokens.MSQDX_TYPOGRAPHY;
    MSQDX_SPACING = tokens.MSQDX_SPACING;
    MSQDX_EFFECTS = tokens.MSQDX_EFFECTS;
  } catch (e2) {
    // Finally fall back to hardcoded tokens
    console.warn('Could not load design tokens from submodule, using fallback values.');
    MSQDX_COLORS = FALLBACK_TOKENS.MSQDX_COLORS;
    MSQDX_TYPOGRAPHY = FALLBACK_TOKENS.MSQDX_TYPOGRAPHY;
    MSQDX_SPACING = FALLBACK_TOKENS.MSQDX_SPACING;
    MSQDX_EFFECTS = FALLBACK_TOKENS.MSQDX_EFFECTS;
  }
}

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // MSQDX Brand Colors
        brand: {
          purple: MSQDX_COLORS.brand.purple,
          yellow: MSQDX_COLORS.brand.yellow,
          pink: MSQDX_COLORS.brand.pink,
          orange: MSQDX_COLORS.brand.orange,
          blue: MSQDX_COLORS.brand.blue,
          green: MSQDX_COLORS.brand.green,
          white: MSQDX_COLORS.brand.white,
          black: MSQDX_COLORS.brand.black,
        },
        // MSQDX Tints (for glass backgrounds)
        tint: {
          purple: MSQDX_COLORS.tints.purple,
          yellow: MSQDX_COLORS.tints.yellow,
          pink: MSQDX_COLORS.tints.pink,
          orange: MSQDX_COLORS.tints.orange,
          blue: MSQDX_COLORS.tints.blue,
          green: MSQDX_COLORS.tints.green,
        },
        // MSQDX Status Colors
        status: {
          success: MSQDX_COLORS.status.success,
          warning: MSQDX_COLORS.status.warning,
          error: MSQDX_COLORS.status.error,
          info: MSQDX_COLORS.status.info,
        },
        // MSQDX Theme Colors
        dark: {
          background: MSQDX_COLORS.dark.background,
          paper: MSQDX_COLORS.dark.paper,
          border: MSQDX_COLORS.dark.border,
          textPrimary: MSQDX_COLORS.dark.textPrimary,
          textSecondary: MSQDX_COLORS.dark.textSecondary,
        },
        light: {
          background: MSQDX_COLORS.light.background,
          paper: MSQDX_COLORS.light.paper,
          border: MSQDX_COLORS.light.border,
          textPrimary: MSQDX_COLORS.light.textPrimary,
          textSecondary: MSQDX_COLORS.light.textSecondary,
        },
        // Legacy glass colors (for backward compatibility)
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          black: 'rgba(0, 0, 0, 0.1)',
        },
      },
      fontFamily: {
        sans: MSQDX_TYPOGRAPHY.fontFamily.primary.split(',').map((f) => f.trim()),
        mono: MSQDX_TYPOGRAPHY.fontFamily.mono.split(',').map((f) => f.trim()),
      },
      fontSize: {
        xs: MSQDX_TYPOGRAPHY.fontSize.xs,
        sm: MSQDX_TYPOGRAPHY.fontSize.sm,
        'body2': MSQDX_TYPOGRAPHY.fontSize.body2,
        'body1': MSQDX_TYPOGRAPHY.fontSize.body1,
        base: MSQDX_TYPOGRAPHY.fontSize.base,
        lg: MSQDX_TYPOGRAPHY.fontSize.lg,
        xl: MSQDX_TYPOGRAPHY.fontSize.xl,
        '2xl': MSQDX_TYPOGRAPHY.fontSize['2xl'],
        '3xl': MSQDX_TYPOGRAPHY.fontSize['3xl'],
        '4xl': MSQDX_TYPOGRAPHY.fontSize['4xl'],
      },
      fontWeight: {
        thin: MSQDX_TYPOGRAPHY.fontWeight.thin,
        extralight: MSQDX_TYPOGRAPHY.fontWeight.extralight,
        light: MSQDX_TYPOGRAPHY.fontWeight.light,
        regular: MSQDX_TYPOGRAPHY.fontWeight.regular,
        medium: MSQDX_TYPOGRAPHY.fontWeight.medium,
        semibold: MSQDX_TYPOGRAPHY.fontWeight.semibold,
        bold: MSQDX_TYPOGRAPHY.fontWeight.bold,
        extrabold: MSQDX_TYPOGRAPHY.fontWeight.extrabold,
        black: MSQDX_TYPOGRAPHY.fontWeight.black,
      },
      lineHeight: {
        tight: MSQDX_TYPOGRAPHY.lineHeight.tight,
        normal: MSQDX_TYPOGRAPHY.lineHeight.normal,
        relaxed: MSQDX_TYPOGRAPHY.lineHeight.relaxed,
        loose: MSQDX_TYPOGRAPHY.lineHeight.loose,
      },
      spacing: {
        xxs: `${MSQDX_SPACING.scale.xxs}px`,
        xs: `${MSQDX_SPACING.scale.xs}px`,
        sm: `${MSQDX_SPACING.scale.sm}px`,
        md: `${MSQDX_SPACING.scale.md}px`,
        lg: `${MSQDX_SPACING.scale.lg}px`,
        xl: `${MSQDX_SPACING.scale.xl}px`,
        xxl: `${MSQDX_SPACING.scale.xxl}px`,
        xxxl: `${MSQDX_SPACING.scale.xxxl}px`,
      },
      borderRadius: {
        none: `${MSQDX_SPACING.borderRadius.none}px`,
        xs: `${MSQDX_SPACING.borderRadius.xs}px`,
        sm: `${MSQDX_SPACING.borderRadius.sm}px`,
        md: `${MSQDX_SPACING.borderRadius.md}px`,
        lg: `${MSQDX_SPACING.borderRadius.lg}px`,
        xl: `${MSQDX_SPACING.borderRadius.xl}px`,
        xxl: `${MSQDX_SPACING.borderRadius.xxl}px`,
        full: `${MSQDX_SPACING.borderRadius.full}px`,
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: MSQDX_EFFECTS.glass.blur, // 12px
        xl: '16px',
      },
      transitionDuration: {
        fast: '0.15s',
        standard: '0.2s',
        slow: '0.3s',
        spring: '0.4s',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      zIndex: {
        base: MSQDX_EFFECTS.zIndex.base,
        dropdown: MSQDX_EFFECTS.zIndex.dropdown,
        sticky: MSQDX_EFFECTS.zIndex.sticky,
        fixed: MSQDX_EFFECTS.zIndex.fixed,
        modalBackdrop: MSQDX_EFFECTS.zIndex.modalBackdrop,
        modal: MSQDX_EFFECTS.zIndex.modal,
        popover: MSQDX_EFFECTS.zIndex.popover,
        tooltip: MSQDX_EFFECTS.zIndex.tooltip,
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
