/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Esto es importante para evitar conflictos
  corePlugins: {
    preflight: false, // Desactiva el reset de CSS de Tailwind
  }
}