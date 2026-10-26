/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Palette sobre : noirs profonds, blanc cassé, gris. La couleur vient des produits.
      colors: {
        ink: '#09090A',
        coal: '#111113',
        smoke: '#1A1A1D',
        paper: '#ECEBE7',
        mist: '#8D8D93',
        signal: '#D4473F',
      },
      fontFamily: {
        display: ['"Inter Tight Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Tight Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      screens: { xs: '420px' },
    },
  },
  plugins: [],
};
