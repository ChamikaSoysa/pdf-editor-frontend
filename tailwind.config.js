/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",          // 👈 Include your HTML file
    "./src/**/*.{js,jsx,ts,tsx}", // 👈 All React component files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}