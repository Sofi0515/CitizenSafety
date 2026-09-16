/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safenet: {
          bg: 'var(--safenet-bg)',
          card: 'var(--safenet-card)',
          border: 'var(--safenet-border)',
          text: 'var(--safenet-text)',
          muted: 'var(--safenet-muted)',
        },
        risk: {
          high: 'var(--risk-high)',
          medium: 'var(--risk-medium)',
          low: 'var(--risk-low)',
          highBg: 'var(--risk-high-bg)',
          mediumBg: 'var(--risk-medium-bg)',
          lowBg: 'var(--risk-low-bg)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          glow: 'var(--brand-glow)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card-light': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'radar-sweep': 'conic-gradient(from 0deg, var(--brand) 0deg, transparent 90deg, transparent 360deg)',
      }
    },
  },
  plugins: [],
}
