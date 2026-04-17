import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Cinzel'", "'Noto Serif JP'", "serif"],
        display: ["'Cinzel Decorative'", "'Noto Serif JP'", "serif"],
      },
      colors: {
        parchment: {
          50: "#f7f0dc",
          100: "#efe2bf",
          200: "#e2cd94",
          900: "#3b2a14",
        },
        royal: {
          gold: "#d4af37",
          crimson: "#7b1e1e",
          navy: "#1e2a4a",
          bronze: "#8c6a2e",
        },
      },
      keyframes: {
        shimmer: {
          "0%,100%": { textShadow: "0 0 6px rgba(212,175,55,0.4)" },
          "50%": { textShadow: "0 0 20px rgba(212,175,55,0.9)" },
        },
        rise: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        sealPulse: {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
      },
      animation: {
        shimmer: "shimmer 3s ease-in-out infinite",
        rise: "rise 0.6s ease-out both",
        seal: "sealPulse 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
