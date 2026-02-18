import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        surface: {
          light: '#f7f7f5',
          dark: '#0f1013'
        },
        ink: {
          light: '#111217',
          dark: '#f2f4f8'
        },
        accent: {
          DEFAULT: '#6b8cff',
          muted: '#9fb3ff'
        }
      },
      fontFamily: {
        sans: ['InterVariable', 'system-ui', 'sans-serif'],
        mono: ['JetBrainsMonoVariable', 'ui-monospace', 'monospace']
      },
      animation: {
        'fade-in': 'fade-in 350ms ease-out',
        'slide-up': 'slide-up 450ms ease-out'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  }
} satisfies Config;
