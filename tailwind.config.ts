import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
        "paper-2": "rgb(var(--paper-2-rgb) / <alpha-value>)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        tomato: "rgb(var(--tomato-rgb) / <alpha-value>)",
        orange: "rgb(var(--orange-rgb) / <alpha-value>)",
        wine: "rgb(var(--wine-rgb) / <alpha-value>)",
        olive: "rgb(var(--olive-rgb) / <alpha-value>)",
        blush: "rgb(var(--blush-rgb) / <alpha-value>)",
        gold: "rgb(var(--gold-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-editorial)", "Georgia", "serif"],
        editorial: ["var(--font-editorial)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        handwritten: ["var(--font-handwritten)", "cursive"],
      },
      boxShadow: {
        paper: "0 18px 45px rgba(50, 36, 27, 0.09)",
        card: "0 8px 24px rgba(50, 36, 27, 0.07)",
      },
      opacity: {
        4: "0.04",
        5: "0.05",
        6: "0.06",
        7: "0.07",
        8: "0.08",
        10: "0.10",
        12: "0.12",
        15: "0.15",
        18: "0.18",
        25: "0.25",
        35: "0.35",
        43: "0.43",
        45: "0.45",
        48: "0.48",
        52: "0.52",
        55: "0.55",
        60: "0.60",
        65: "0.65",
        67: "0.67",
        68: "0.68",
      },
    },
  },
  plugins: [],
};

export default config;
