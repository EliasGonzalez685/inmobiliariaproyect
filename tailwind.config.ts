import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
          500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
        },
        ink: { 900: '#0b1220', 800: '#111a2e', 700: '#1a2540' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px -4px rgba(15,23,42,.08)',
        lift: '0 2px 4px rgba(15,23,42,.05), 0 16px 32px -12px rgba(15,23,42,.18)',
        glow: '0 8px 24px -8px rgba(79,70,229,.55)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { rise: 'rise .35s ease-out both' },
    },
  },
  plugins: [],
};
export default config;
