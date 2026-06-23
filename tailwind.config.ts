import type { Config } from 'tailwindcss'

/**
 * Theme-aware color tokens.
 * Colors that participate in the shop theme system use CSS custom property
 * references in the rgb(var() / <alpha-value>) pattern so that Tailwind's
 * opacity modifiers (bg-teal/10, text-teal/60, etc.) keep working when the
 * theme changes at runtime. ThemeContext writes --color-teal and --color-bg
 * (as space-separated RGB channel values) to document.documentElement.
 *
 * Non-themeable tokens (gold, cat-*, teal-deep) stay as literal hex values
 * because the shop spec does not vary them per theme.
 */
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
        // Theme-sensitive: driven by CSS variables set by ThemeContext
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        teal:       'rgb(var(--color-teal) / <alpha-value>)',

        // Non-themeable design tokens
        'teal-deep':   '#0D9488',
        gold:          '#D9A653',
        'cat-health':  '#D08B68',
        'cat-admin':   '#8B8B85',
      },
      fontFamily: {
        heading: ['var(--font-geist)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-fraunces)', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
