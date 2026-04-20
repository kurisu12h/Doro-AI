/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#0071e3',
          'blue-link': '#0066cc',
          'blue-dark': '#2997ff',
          dark: '#1d1d1f',
          black: '#000000',
          light: '#f5f5f7',
          white: '#ffffff',
          'btn-bg': '#fafafc',
          'text-2': 'rgba(0,0,0,0.56)',
          'text-3': 'rgba(0,0,0,0.36)',
          'surface-dark': '#272729',
        },
      },
      borderRadius: {
        pill: '980px',
        '2xl': '12px',
        xl: '11px',
        lg: '8px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        apple: 'rgba(0,0,0,0.12) 0px 2px 12px 0px',
        'apple-lg': '0px 8px 40px rgba(0,0,0,0.12)',
        'apple-sm': '0px 2px 8px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
