/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2E7D32",
        secondary: "#66BB6A",
        accent: "#FFA726",
        app: "#0b160b",
        card: "#0b0c0f",
        text: "#030608"
      }
    }
  },
  plugins: []
};

