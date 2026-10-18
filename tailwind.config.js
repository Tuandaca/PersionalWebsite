/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        space: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        accent: {
          green: '#00ff87',
          neon: '#39ff14',
          emerald: '#10b981',
        },
      },
      keyframes: {
        animStar: {
          from: { transform: 'translateY(0px)' },
          to:   { transform: 'translateY(-2000px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,255,135,0.45)' },
          '50%':       { boxShadow: '0 0 45px rgba(0,255,135,0.5), 0 0 90px rgba(0,255,135,0.2)' },
        },
        'border-spin': {
          from: { '--gradient-angle': '0deg' },
          to:   { '--gradient-angle': '360deg' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        }
      },
      animation: {
        animStar: 'animStar 50s linear infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
