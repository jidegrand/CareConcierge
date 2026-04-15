/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clinical: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          500: '#1D6FA8',
          600: '#155E8C',
          700: '#0D4A70',
          800: '#083A57',
          900: '#042638',
        },
        surface: '#FFFFFF',
        page:    '#F0F4F8',
        border:  '#D1D9E0',
        muted:   '#8A97A8',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        lift: '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
      }
    }
  },
  plugins: []
}
