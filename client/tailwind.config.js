/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Itzfizz brand fonts (matches the Doctor Fizz design language)
        sans: ['"JUST Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Neue Machina"', '"JUST Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // Orange → amber brand ramp built around #d45427 / #E9652C
        brand: {
          50: '#fef4ee',
          100: '#fde5d6',
          200: '#fac7ac',
          300: '#f5a377',
          400: '#ef7c45',
          500: '#e9652c', // accent (profile hover in drfizz)
          600: '#d45427', // gradient start / primary
          700: '#b1401d',
          800: '#8d351c',
          900: '#722d1a',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to right, #d45427 0%, #ffa615 100%)',
        'brand-gradient-v': 'linear-gradient(to bottom, #d45427 0%, #ffa615 100%)',
        'brand-soft': 'linear-gradient(to right, rgb(212 84 39 / 0.5) 0%, rgb(255 166 21 / 0.5) 100%)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
        lift: '0 12px 30px -10px rgba(212,84,39,.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease both',
      },
    },
  },
  plugins: [],
};
