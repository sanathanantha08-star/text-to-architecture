import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AWS architecture icon category colors
        aws: {
          compute: "#ED7100",
          networking: "#8C4FFF",
          storage: "#7AA116",
          database: "#2E27AD",
          integration: "#E7157B",
          ml: "#01A88D",
          security: "#DD344C",
          management: "#CD2264",
          generic: "#5A6B86",
        },
      },
    },
  },
  plugins: [],
};

export default config;
