import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0A0B',
          900: '#101012',
          850: '#141416',
          800: '#17171A',
          750: '#1B1B1F',
          700: '#1E1E22',
          600: '#26262B',
          500: '#33333A',
        },
        fg: {
          DEFAULT: '#EDEDEF',
          muted: '#A1A1AA',
          dim: '#6E6E78',
        },
        accent: {
          DEFAULT: '#5B8DEF',
          soft: '#7BA4FF',
          deep: '#3D6FD4',
        },
        ok: '#3FB950',
        warn: '#D29922',
        bad: '#F85149',
      },
      fontFamily: {
        sans: [
          'Helvetica Neue',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 24px 60px -20px rgba(0, 0, 0, 0.7)',
        glow: '0 0 0 1px rgba(91, 141, 239, 0.35), 0 12px 40px -12px rgba(91, 141, 239, 0.35)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        blink: {
          '0%, 45%': { opacity: '1' },
          '55%, 100%': { opacity: '0.15' },
        },
      },
      animation: {
        'fade-up': 'fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 180ms ease-out',
        'scale-in': 'scale-in 160ms cubic-bezier(0.22, 1, 0.36, 1)',
        blink: 'blink 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
}
