import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080808',
        teal: '#2DD4BF',
        'teal-deep': '#0D9488',
        gold: '#D9A653',
        'cat-health': '#D08B68',
        'cat-admin': '#8B8B85',
      },
      fontFamily: {
        heading: ['var(--font-geist)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-fraunces)', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
