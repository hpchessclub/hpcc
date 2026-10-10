import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hpcc: {
          navy: "#244A2C",
          blue: "#315B38",
          royal: "#244A2C",
          accent: "#D9EED0",
          pale: "#F1F8ED",
          gold: "#D9EED0"
        }
      },
      boxShadow: { soft: "0 14px 45px rgba(6,19,34,0.12)" }
    }
  },
  plugins: []
};
export default config;
