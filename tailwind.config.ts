import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Noto Serif JP'", "serif"],
        display: ["'Noto Serif JP'", "'Cinzel Decorative'", "serif"],
      },
      colors: {
        velvet: {
          950: "#0f0306",
          900: "#1a0408",
          800: "#2a0810",
          700: "#3d0c14",
          600: "#5a121e",
          500: "#7a1828",
        },
        goldleaf: {
          50: "#fef9e7",
          100: "#faecb1",
          200: "#f5d97c",
          300: "#f0c63b",
          400: "#e8b537",
          500: "#d4af37",
          600: "#a87900",
          700: "#7a5a16",
        },
        cardA: {
          DEFAULT: "#c41e3a",
          dark: "#7a0e1f",
          light: "#e54561",
        },
        cardB: {
          DEFAULT: "#1e3a8a",
          dark: "#0e1f5a",
          light: "#3a5cb8",
        },
      },
      keyframes: {
        shimmer: {
          "0%,100%": { textShadow: "0 0 8px rgba(245,217,124,0.5), 0 0 18px rgba(212,175,55,0.4)" },
          "50%": { textShadow: "0 0 18px rgba(245,217,124,0.95), 0 0 36px rgba(212,175,55,0.85)" },
        },
        rise: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        sealPulse: {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        sparkle: {
          "0%,100%": { opacity: "0.4", transform: "scale(1) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1.2) rotate(180deg)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s ease-in-out infinite",
        rise: "rise 0.6s ease-out both",
        seal: "sealPulse 2.5s ease-in-out infinite",
        sparkle: "sparkle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
