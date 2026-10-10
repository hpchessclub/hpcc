import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hpcc: {
          navy: "#17351F",
          blue: "#436F38",
          royal: "#598F47",
          accent: "#598F47",
          pale: "#F4F8F1",
          gold: "#A7CC92"
        }
      },
      boxShadow: { soft: "0 14px 45px rgba(6,19,34,0.12)" }
    }
  },
  plugins: []
};
export default config;
