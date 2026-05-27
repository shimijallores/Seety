/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#41176b',
          light: '#6b34a8',
          muted: '#f0eaf8',
        },
        background: '#ffffff',
        'text-base': '#1a1a2e',
        'text-muted': '#6b7280',
        border: '#e5e7eb',
        danger: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pin: '0 0 0 4px rgba(65,23,107,0.25)',
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        panel: '4px 0 24px 0 rgba(0,0,0,0.08)',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pin-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-6px) scale(1.1)' },
        },
        'dash-offset': {
          to: { strokeDashoffset: '-20' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.4,0,0.2,1)',
        'slide-in-up': 'slide-in-up 0.3s cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'pin-bounce': 'pin-bounce 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
