import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101114",
        panel: "#1c1e22",
        acid: "#b4f45a",
      },
    },
  },
  plugins: [],
} satisfies Config;
