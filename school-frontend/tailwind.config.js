/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3B1099', // Фирменный цвет МГУ
          light: '#5A2BC5',
          dark: '#250A66',
        },
        dark: '#121214',
        surface: '#1E1E22',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}