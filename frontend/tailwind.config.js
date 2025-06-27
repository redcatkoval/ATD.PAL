/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF5722',
          hover: '#E64A19',
        },
        textColor: '#131C20',
        inputText: '#636363',
        inputBorder: '#939393',
        ctaButton: '#F85A00',
        ctaText: '#FFFFFF',
        dividerLine: '#888888',
        dividerText: '#636363',
        googleBorder: '#767676',
        googleText: '#131C20',
        errorText: '#F5412E',
        errorBorder: '#F5412E',
        darkGray: '#42494D',
        orange: {
          DEFAULT: '#F85A00',
          500: '#F85A00',
        },
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        google: 'var(--color-google)',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      spacing: {
        '0': 'var(--space-0)',
        '4': 'var(--space-4)',
        '8': 'var(--space-8)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
        '24': 'var(--space-24)',
        '32': 'var(--space-32)',
        '48': 'var(--space-48)',
      },
      borderRadius: {
        '0': 'var(--radius-0)',
        '6': 'var(--radius-6)',
        '8': 'var(--radius-8)',
        '12': 'var(--radius-12)',
        '16': 'var(--radius-16)',
      },
      screens: {
        'mobile': '564px',
      },
    },
  },
  plugins: [],
}