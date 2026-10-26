/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080808',
        paper: '#FFFFFF',
        volt: '#C6FF00',
        electric: '#315BFF',
        flash: '#FF3CAC',
        ultra: '#8B5CF6',
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        sans: ['"Inter Tight Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      screens: { xs: '420px' },
    },
  },
  plugins: [],
};
