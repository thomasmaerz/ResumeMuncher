import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-app': '#0a0a0f',
        'bg-surface': '#13131a',
        'bg-border': '#1e1e2e',
        'accent': '#6366f1',
        'accent-muted': '#6366f120',
        'text-base': '#f1f5f9',
        'text-muted': '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
