import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#07071a',
          secondary: '#0d0d2b',
          tertiary: '#12123a',
          card: '#111130',
          hover: '#1a1a45',
        },
        border: {
          DEFAULT: '#1e1e5a',
          light: '#2a2a7a',
          focus: '#4040aa',
        },
        text: {
          primary: '#f0f0ff',
          secondary: '#a0a0cc',
          muted: '#6060aa',
          disabled: '#3a3a7a',
        },
        brand: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
        },
        profit: {
          DEFAULT: '#10d98a',
          light: '#34eba0',
          dark: '#0ab870',
          bg: 'rgba(16, 217, 138, 0.1)',
        },
        loss: {
          DEFAULT: '#f43f5e',
          light: '#fb7185',
          dark: '#e11d48',
          bg: 'rgba(244, 63, 94, 0.1)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.1)',
        },
        sector: {
          it: '#60a5fa',
          banking: '#34d399',
          energy: '#fb923c',
          pharma: '#c084fc',
          auto: '#fbbf24',
          fmcg: '#f472b6',
          metal: '#94a3b8',
          telecom: '#22d3ee',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-green': 'pulseGreen 1s ease-in-out',
        'pulse-red': 'pulseRed 1s ease-in-out',
        'ticker': 'ticker 60s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(16, 217, 138, 0.15)' },
        },
        pulseRed: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(244, 63, 94, 0.15)' },
        },
        ticker: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.5)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, #111130 0%, #0d0d2b 100%)',
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'profit-gradient': 'linear-gradient(135deg, #10d98a 0%, #06b6d4 100%)',
        'loss-gradient': 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        glow: '0 0 30px rgba(99, 102, 241, 0.4)',
        'glow-green': '0 0 30px rgba(16, 217, 138, 0.3)',
        'glow-red': '0 0 30px rgba(244, 63, 94, 0.3)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
