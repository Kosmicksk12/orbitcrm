import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cool control-room palette. Deliberately not the cream/serif or
        // black/neon defaults: a frosty slate ground with one confident
        // indigo accent used only for actionable elements.
        bg: {
          DEFAULT: "#EEF1F6",
          dark: "#0B1220",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#111A2E",
        },
        ink: {
          DEFAULT: "#101828",
          dim: "#3D4557",
          muted: "#5B6478",
          dark: "#E7EAF3",
          "dark-muted": "#8C97B3",
        },
        line: {
          DEFAULT: "#DEE3ED",
          dark: "#232D45",
        },
        accent: {
          50: "#EEF0FF",
          100: "#D9DEFF",
          400: "#5B67FF",
          DEFAULT: "#3B45F0",
          600: "#2F39D6",
          700: "#242CAA",
        },
        success: { DEFAULT: "#15803D", soft: "#DCFCE7" },
        warning: { DEFAULT: "#B45309", soft: "#FEF3C7" },
        danger: { DEFAULT: "#B91C1C", soft: "#FEE2E2" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        raised: "0 4px 12px rgba(16, 24, 40, 0.08), 0 2px 4px rgba(16, 24, 40, 0.04)",
        popover: "0 12px 32px rgba(16, 24, 40, 0.16)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "slide-up": "slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
