import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hpcc: {
          navy: "#171717",
          blue: "#444444",
          royal: "#555555",
          accent: "#555555",
          pale: "#FAFAF9",
          gold: "#DDE0DE"
        }
      },
      boxShadow: { soft: "0 14px 45px rgba(6,19,34,0.12)" }
    }
  },
  plugins: []
};
export default config;
