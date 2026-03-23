/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        headline: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        label: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#bd9dff',
        'primary-dim': '#8a4cfc',
        'primary-fixed': '#b28cff',
        'primary-fixed-dim': '#a67aff',
        'primary-container': '#b28cff',
        'on-primary': '#3c0089',
        'on-primary-container': '#2e006c',
        'on-primary-fixed': '#000000',
        'on-primary-fixed-variant': '#390083',
        'inverse-primary': '#742fe5',

        secondary: '#00cffc',
        'secondary-dim': '#00c0ea',
        'secondary-fixed': '#80deff',
        'secondary-fixed-dim': '#37d4ff',
        'secondary-container': '#00677f',
        'on-secondary': '#004050',
        'on-secondary-container': '#eef9ff',
        'on-secondary-fixed': '#003a48',
        'on-secondary-fixed-variant': '#00586d',

        tertiary: '#ffe083',
        'tertiary-dim': '#eec200',
        'tertiary-fixed': '#fed01b',
        'tertiary-fixed-dim': '#eec200',
        'tertiary-container': '#fed01b',
        'on-tertiary': '#645000',
        'on-tertiary-container': '#594700',
        'on-tertiary-fixed': '#433500',
        'on-tertiary-fixed-variant': '#645000',

        surface: '#180429',
        'surface-dim': '#180429',
        'surface-bright': '#3c1d56',
        'surface-variant': '#34184c',
        'surface-tint': '#bd9dff',
        'surface-container-lowest': '#000000',
        'surface-container-low': '#1e0831',
        'surface-container': '#250d3a',
        'surface-container-high': '#2c1343',
        'surface-container-highest': '#34184c',

        'on-surface': '#f3deff',
        'on-surface-variant': '#bba1cf',
        'on-background': '#f3deff',
        background: '#180429',

        error: '#ff6e84',
        'error-dim': '#d73357',
        'error-container': '#a70138',
        'on-error': '#490013',
        'on-error-container': '#ffb2b9',

        outline: '#846c96',
        'outline-variant': '#543f66',

        'inverse-surface': '#fff7fe',
        'inverse-on-surface': '#624c74',
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
