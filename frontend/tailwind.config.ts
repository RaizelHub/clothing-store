import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0e0d0c",
          pure: "#000000",
          muted: "#57534e",
          subtle: "#8c857b",
        },
        paper: {
          DEFAULT: "#f8f7f4",
          pure: "#ffffff",
          muted: "#f1efe9",
          card: "#ffffff",
        },
        stone: {
          50: "#faf9f7",
          100: "#f3f1ec",
          200: "#e6e2d8",
          300: "#d2ccc0",
          400: "#a9a193",
          500: "#7c7567",
          600: "#5a5448",
          700: "#3f3a31",
          800: "#27241e",
          900: "#141310",
          950: "#0b0a08",
        },
        accent: {
          DEFAULT: "#943033",
          hover: "#7d2629",
          subtle: "#fbf0f0",
        },
        gold: "#c5a880",
        success: "#2d5a3e",
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.02em",
        normal: "0",
        wide: "0.05em",
        wider: "0.1em",
        widest: "0.2em",
        "ultra-wide": "0.3em",
      },
      maxWidth: {
        "8xl": "96rem",
        "9xl": "112rem",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.16, 1, 0.3, 1)",
        sharp: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
        800: "800ms",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        editorial: "0 10px 30px -10px rgba(0, 0, 0, 0.07)",
        drawer: "-10px 0 30px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

