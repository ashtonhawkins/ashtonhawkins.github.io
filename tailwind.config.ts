import plugin from 'tailwindcss/plugin';
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        md: '2rem'
      }
    },
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          card: 'var(--bg-card)'
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)'
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          glow: 'var(--accent-glow)'
        },
        scanline: 'var(--scanline)',
        border: 'var(--border)'
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk Variable', 'Space Grotesk', 'Inter Variable', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'JetBrains Mono', 'ui-monospace', 'monospace']
      },
      maxWidth: {
        prose: '45rem',
        grid: '67.5rem',
        wide: '80rem'
      },
      keyframes: {
        'crt-flicker': {
          '0%': { opacity: '0.97' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.98' }
        },
        'glitch-load': {
          '0%, 100%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
          '20%': { clipPath: 'inset(15% 0 55% 0)', transform: 'translate(-1px, 1px)' },
          '40%': { clipPath: 'inset(65% 0 8% 0)', transform: 'translate(1px, -1px)' },
          '60%': { clipPath: 'inset(35% 0 35% 0)', transform: 'translate(0.5px, 0.5px)' },
          '80%': { clipPath: 'inset(5% 0 75% 0)', transform: 'translate(-0.5px, -0.5px)' }
        },
        'glitch-layer-1': {
          '0%, 100%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
          '30%': { clipPath: 'inset(10% 0 60% 0)', transform: 'translate(-2px, 1px)' },
          '70%': { clipPath: 'inset(60% 0 12% 0)', transform: 'translate(1px, -1px)' }
        },
        'glitch-layer-2': {
          '0%, 100%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
          '25%': { clipPath: 'inset(70% 0 10% 0)', transform: 'translate(2px, -1px)' },
          '65%': { clipPath: 'inset(18% 0 52% 0)', transform: 'translate(-1px, 1px)' }
        }
      },
      animation: {
        'crt-flicker': 'crt-flicker 0.15s linear infinite',
        glitch: 'glitch-load 900ms steps(2, end) 1',
        'glitch-layer-1': 'glitch-layer-1 850ms steps(2, end) 1',
        'glitch-layer-2': 'glitch-layer-2 950ms steps(2, end) 1'
      }
    }
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.crt-scanlines': {
          position: 'relative'
        },
        '.crt-flicker': {
          animation: 'crt-flicker 0.15s linear infinite'
        },
        '.crt-glow': {
          textShadow: '0 0 0.4rem var(--accent-glow), 0 0 1.2rem var(--accent-glow)'
        },
        '.glitch': {
          position: 'relative',
          animation: 'glitch-load 900ms steps(2, end) 1'
        },
        '.text-balance': {
          textWrap: 'balance'
        }
      });
    })
  ]
} satisfies Config;
