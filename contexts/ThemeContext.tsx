'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient }                                            from '@/lib/supabase/client'

/**
 * Converts a hex colour (#RRGGBB) to space-separated RGB channel values
 * ("R G B") for use as CSS custom property values in the rgb(var() / alpha) pattern.
 * Tailwind's opacity modifiers require this format, not a full rgba() string.
 */
function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

/** Applies accent and background hex values as CSS variables on <html>. */
function applyTheme(accentHex: string, backgroundHex: string): void {
  const root = document.documentElement
  root.style.setProperty('--color-teal', hexToRgbChannels(accentHex))
  root.style.setProperty('--color-bg',   hexToRgbChannels(backgroundHex))
}

interface ThemeContextValue {
  activeThemeId: string | null
  /** Switch to a theme the user already owns. Applies immediately, then persists to DB. */
  switchTheme: (themeId: string | null, accentHex: string, backgroundHex: string) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>({
  activeThemeId: null,
  switchTheme:   async () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

interface ThemeProviderProps {
  children:       React.ReactNode
  /** Server-fetched initial theme values — applied synchronously before first paint. */
  initialThemeId: string | null
  initialAccent:  string
  initialBg:      string
}

export function ThemeProvider({
  children, initialThemeId, initialAccent, initialBg,
}: ThemeProviderProps) {
  const [activeThemeId, setActiveThemeId] = useState<string | null>(initialThemeId)
  const supabase = useRef(createClient()).current

  // Apply initial theme on mount — runs before React hydration completes so
  // there is no flash of the default colours when the user has a custom theme.
  useEffect(() => {
    applyTheme(initialAccent, initialBg)
  }, [initialAccent, initialBg])

  async function switchTheme(
    themeId:       string | null,
    accentHex:     string,
    backgroundHex: string,
  ): Promise<void> {
    // Apply CSS variables immediately — no page reload needed.
    applyTheme(accentHex, backgroundHex)
    setActiveThemeId(themeId)

    // Persist to DB. Failure is silent — the visual switch already happened.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('users')
        .update({ active_theme_id: themeId })
        .eq('id', user.id)
    }
  }

  return (
    <ThemeContext.Provider value={{ activeThemeId, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
