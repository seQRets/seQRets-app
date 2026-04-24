import type {Config} from 'tailwindcss';

const sharedTheme = require('../../tailwind.theme.cjs');

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: sharedTheme,
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
