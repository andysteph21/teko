// GÉNÉRÉ par scripts/generate-tokens.mjs depuis docs/design/design-tokens.json
// — NE PAS ÉDITER À LA MAIN. Régénérer : pnpm gen:tokens (package @teko/ui).
// Tout écart entre ces valeurs et les maquettes est un bug (convention projet).

export const tokens = {
  color: {
    brand: {
      "50": "#F5E6FF",
      "100": "#E8C6FF",
      "200": "#D49FFF",
      "300": "#BB6EF0",
      "400": "#A040D8",
      "500": "#8C238A",
      "600": "#7A1F8A",
      "700": "#6A1E86",
      "800": "#5A1A80",
      "900": "#3D0F5C",
    },
    gradient: {
      brand: "linear-gradient(135deg, #5A1A80 0%, #8C238A 100%)",
      brandVertical: "linear-gradient(180deg, #5A1A80 0%, #8C238A 100%)",
      brandSubtle: "linear-gradient(135deg, #F5E6FF 0%, #F0D0F5 100%)",
    },
    neutral: {
      "0": "#FFFFFF",
      "50": "#F9F9FB",
      "100": "#F0F0F5",
      "200": "#E0E0EA",
      "300": "#C4C4D4",
      "400": "#9090A8",
      "500": "#6B6B80",
      "600": "#4A4A60",
      "700": "#323248",
      "800": "#1E1E30",
      "900": "#0F0F1E",
    },
    semantic: {
      success: {
        light: "#E6F9F0",
        default: "#22C47A",
        dark: "#15874F",
      },
      warning: {
        light: "#FFF8E6",
        default: "#F5A623",
        dark: "#B57308",
      },
      error: {
        light: "#FFF0F0",
        default: "#E53E3E",
        dark: "#9B1C1C",
      },
      info: {
        light: "#E6F0FF",
        default: "#3B82F6",
        dark: "#1D4ED8",
      },
    },
    role: {
      driver: {
        accent: "#00BFA5",
        accentLight: "#E0F7F4",
        accentDark: "#007A6A",
      },
      client: {
        accent: "#8C238A",
      },
    },
    map: {
      markerClient: "#8C238A",
      markerDriver: "#00BFA5",
      markerLandmark: "#F5A623",
      routeLine: "#5A1A80",
      routeLineAlternate: "#9090A8",
    },
  },
  typography: {
    fontFamily: {
      base: "System, -apple-system, 'SF Pro Text', 'Roboto', 'Segoe UI', sans-serif",
      mono: "'SF Mono', 'Roboto Mono', 'Courier New', monospace",
      display: "System, -apple-system, 'SF Pro Display', 'Roboto', sans-serif",
    },
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 17,
      lg: 20,
      xl: 24,
      "2xl": 28,
      "3xl": 34,
    },
    fontWeight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      black: "900",
    },
    lineHeight: {
      tight: 1.2,
      snug: 1.35,
      normal: 1.5,
      relaxed: 1.65,
    },
    letterSpacing: {
      tight: -0.3,
      normal: 0,
      wide: 0.5,
      wider: 1,
    },
  },
  spacing: {
    "0": 0,
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "7": 28,
    "8": 32,
    "10": 40,
    "12": 48,
    "14": 56,
    "16": 64,
    "20": 80,
    "24": 96,
  },
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 28,
    full: 9999,
  },
  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.07)",
    sm: "0 2px 6px rgba(0,0,0,0.10)",
    md: "0 4px 16px rgba(0,0,0,0.12)",
    lg: "0 8px 32px rgba(0,0,0,0.16)",
    xl: "0 16px 48px rgba(0,0,0,0.22)",
    brand: "0 4px 24px rgba(90,26,128,0.35)",
  },
  animation: {
    duration: {
      instant: 80,
      fast: 150,
      normal: 250,
      slow: 400,
      verySlow: 600,
    },
    easing: {
      standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      decelerate: "cubic-bezier(0.0, 0, 0.2, 1)",
      accelerate: "cubic-bezier(0.4, 0, 1, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },
  zIndex: {
    base: 0,
    raised: 10,
    overlay: 100,
    sheet: 200,
    widget: 300,
    toast: 400,
    modal: 500,
  },
  breakpoint: {
    sm: 375,
    md: 390,
    lg: 430,
    tablet: 768,
    desktop: 1024,
  },
} as const;

export const color = tokens.color;
export const typography = tokens.typography;
export const spacing = tokens.spacing;
export const borderRadius = tokens.borderRadius;
export const shadow = tokens.shadow;
export const animation = tokens.animation;
export const zIndex = tokens.zIndex;
export const breakpoint = tokens.breakpoint;

export type Tokens = typeof tokens;
