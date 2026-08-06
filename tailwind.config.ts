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
        // Bordered-soft (light) + dark-minimal (dark) palette. Corporate
        // blue accent on light, cool celeste accent on dark. `nav` is the
        // dedicated navy sidebar surface — deliberately distinct from
        // `surface` so the shell reads as a signature element.
        bg: {
          DEFAULT: "#F1F3F9",
          dark: "#080B12",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#0F1420",
        },
        nav: {
          DEFAULT: "#121A2E",
          dark: "#0B0F19",
        },
        ink: {
          DEFAULT: "#0F1729",
          dim: "#3D4557",
          muted: "#5B6478",
          dark: "#E9ECF5",
          "dark-muted": "#8892AB",
        },
        line: {
          DEFAULT: "#D7DCE8",
          dark: "#1B2333",
        },
        accent: {
          50: "#EAF0FF",
          100: "#CBDAFF",
          400: "#5FC7F0",
          DEFAULT: "#2647E0",
          600: "#1B37BE",
          700: "#162C97",
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
        card: "0 1px 2px rgba(15, 23, 41, 0.06), 0 2px 6px rgba(15, 23, 41, 0.06)",
        raised: "0 6px 16px rgba(15, 23, 41, 0.10), 0 2px 4px rgba(15, 23, 41, 0.06)",
        popover: "0 12px 32px rgba(15, 23, 41, 0.18)",
        button: "0 1px 2px rgba(15, 23, 41, 0.06), 0 2px 8px rgba(38, 71, 224, 0.24)",
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
