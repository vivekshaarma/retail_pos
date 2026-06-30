/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan for class names.
  // It only includes classes it finds here in the final CSS bundle.
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Custom color tokens for RetailOS brand
      colors: {
        brand: {
          50:  "#e6f1fb",
          100: "#b5d4f4",
          500: "#378add",
          600: "#185fa5",
          700: "#0c447c",
          900: "#042c53",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
