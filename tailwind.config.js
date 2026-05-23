/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
          800: '#7F1D1D',
          900: '#450a0a',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        steel: {
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#556477',
          500: '#6b7280',
          600: '#8b95a2',
          700: '#bcc3cb',
          800: '#d5dae0',
          900: '#ebeef2',
          950: '#ffffff',
        },
        neumorph: {
          base: '#ebf0f7',
          surface: '#e2e8f0',
          dark: '#c8ccd2',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
      },
      animation: {
        'gear-spin': 'gear-spin 12s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-up': 'slide-up 0.5s ease-out both',
        'slide-right': 'slide-right 0.3s ease-out both',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'chromium-border': 'chromium-border 4s linear infinite',
        'count-up': 'count-up 0.6s ease-out both',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 0.3s ease-out both',
      },
      keyframes: {
        'gear-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220,38,38,0)' },
          '50%': { boxShadow: '0 0 24px 4px rgba(220,38,38,0.12)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'chromium-border': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220,38,38,0), -2px 0 0 0 rgba(220,38,38,0)' },
          '50%': { boxShadow: '0 0 12px 2px rgba(220,38,38,0.08), -2px 0 8px 0 rgba(220,38,38,0.15)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
        'chromium-grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        'dot-grid': '20px 20px',
      },
      boxShadow: {
        'forge': '0 0 15px -3px rgba(220,38,38,0.12), 0 0 6px -4px rgba(220,38,38,0.08)',
        'steel': '0 4px 24px -4px rgba(0,0,0,0.08)',
        'chromium': '0 4px 24px -4px rgba(0,0,0,0.12), 0 -1px 0 rgba(255,255,255,0.03)',
        'chromium-hover': '0 8px 32px -4px rgba(0,0,0,0.16), 0 0 20px rgba(220,38,38,0.06)',
        'chromium-glow': '0 0 20px rgba(220,38,38,0.06)',
        'neumorph': '8px 8px 16px #c8ccd2, -8px -8px 16px #ffffff',
        'neumorph-sm': '4px 4px 8px #c8ccd2, -4px -4px 8px #ffffff',
        'neumorph-inset': 'inset 6px 6px 12px #c8ccd2, inset -6px -6px 12px #ffffff',
        'neumorph-inset-sm': 'inset 3px 3px 6px #c8ccd2, inset -3px -3px 6px #ffffff',
      },
    },
  },
  plugins: [],
}
