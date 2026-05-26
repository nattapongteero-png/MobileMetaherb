/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16a34a",
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        herb: {
          green: "#2d6a4f",
          leaf: "#52b788",
          earth: "#b08968",
          cream: "#faf3e0",
        },
      },
      fontFamily: {
        thai: ["IBMPlexSansThaiLooped", "System"],
      },
    },
  },
  plugins: [],
};
