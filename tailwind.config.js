/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#3A86C8', dark: '#1E5D94', 50: '#EFF6FC', 100: '#DCEBF7', 200: '#B9D6EE' },
        accent: { DEFAULT: '#2EC4B6', 50: '#E8F8F6' },
        ink: { DEFAULT: '#0F172A', 2: '#64748B' },
        surface: '#F7F9FC',
        line: '#E2E8F0',
        ok: { DEFAULT: '#16A34A', 50: '#E8F6EC' },
        warn: { DEFAULT: '#B7791F', 50: '#FEF4DC' },
        bad: { DEFAULT: '#DC2626', 50: '#FDECEC' },
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.05), 0 6px 18px rgba(30,93,148,.07)' },
    },
  },
  plugins: [],
};
