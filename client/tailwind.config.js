/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          'light-1': 'rgba(255, 255, 255, 0.7)',
          'light-2': 'rgba(255, 255, 255, 0.5)',
          'light-3': 'rgba(255, 255, 255, 0.3)',
          'dark-1': 'rgba(30, 30, 30, 0.8)',
          'dark-2': 'rgba(30, 30, 30, 0.6)',
          'dark-3': 'rgba(30, 30, 30, 0.4)',
        },
      },
      backdropBlur: {
        'glass': '40px',
      },
    },
  },
  plugins: [],
}
