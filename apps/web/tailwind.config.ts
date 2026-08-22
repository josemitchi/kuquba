import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/config/src/**/*.ts"],
  theme: {
    extend: {
      colors: {
        midnight: "#0D2233",
        green: "#14685A",
        terracotta: "#C46A3A",
        beige: "#E6C9A6",
        ivory: "#F7F3EB",
        ink: "#101828",
        line: "#D9E1E7"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(13, 34, 51, 0.12)",
        panel: "0 20px 80px rgba(13, 34, 51, 0.18)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        display: ["Georgia", "Cambria", "Times New Roman", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
