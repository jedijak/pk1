/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-tan': '#C4A882',
        'card-human': '#D4B896',
        'card-code': '#E8E8E8',
        'priority-critical': '#EF4444',
        'priority-high': '#F97316',
        'priority-medium': '#EAB308',
        'priority-low': '#22C55E',
      }
    },
  },
  plugins: [],
}
