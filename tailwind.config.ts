import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'accent': 'var(--accent-primary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'danger': 'var(--danger)',
        'border-color': 'var(--border)',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['DM Sans', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'bg-glow': 'bgGlow 2s ease-in-out infinite',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}

export default config
