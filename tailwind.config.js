/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Sistema de diseño Ljus (escandinavo, minimalista)
      colors: {
        bg: '#F5F3EF',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#1B1B19',
          2: '#5E5B55',
        },
        line: {
          DEFAULT: '#E4E0D9',
          soft: '#EEEBE5',
        },
        accent: {
          DEFAULT: '#2F4F46',
          hover: '#1F3530',
          soft: '#E6ECE9',
        },
        pending: {
          DEFAULT: '#F6E7D3',
          ink: '#7A4A12',
        },
      },
      borderRadius: {
        input: '12px',
        btn: '14px',
        card: '16px',
      },
      fontSize: {
        label: ['13px', { lineHeight: '18px', letterSpacing: '0.08em' }],
        title: ['28px', { lineHeight: '34px', letterSpacing: '-0.02em' }],
        'title-lg': ['36px', { lineHeight: '42px', letterSpacing: '-0.025em' }],
      },
      height: {
        cta: '54px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};
