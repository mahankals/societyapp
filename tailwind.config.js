/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.php",
    "./admin/**/*.php",
    "./auth/**/*.php",
    "./client/**/*.php",
    "./includes/**/*.php",
    "./templates/**/*.twig"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
