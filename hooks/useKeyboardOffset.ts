'use client'
import { useEffect, useState } from 'react'

/**
 * Locks background scroll and returns positioning values for a bottom sheet
 * that should sit above the iOS virtual keyboard.
 *
 * `bottom`    — CSS bottom value (px) anchoring the sheet above the keyboard.
 * `maxHeight` — caps the sheet to the visual viewport minus a 2rem gap so the
 *               sheet never overflows above the top of the screen.
 *
 * Uses position:fixed on body (more reliable than overflow:hidden on iOS Safari
 * standalone PWA) and the visualViewport API to track keyboard height.
 */
export function useKeyboardOffset(): { bottom: number; maxHeight: string } {
  const [bottom,   setBottom]   = useState(0)
  const [vvHeight, setVvHeight] = useState<number | null>(null)

  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top      = `-${scrollY}px`
    document.body.style.overflow = 'hidden'
    document.body.style.width    = '100%'

    function restore() {
      document.body.style.position = ''
      document.body.style.top      = ''
      document.body.style.overflow = ''
      document.body.style.width    = ''
      window.scrollTo(0, scrollY)
    }

    if (!window.visualViewport) return restore

    // Assign to a typed const so TypeScript knows it's non-null inside closures.
    const vv: VisualViewport = window.visualViewport

    function update() {
      const kh = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      setBottom(kh)
      setVvHeight(vv.height)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      restore()
    }
  }, [])

  return {
    bottom,
    maxHeight: vvHeight ? `${vvHeight - 32}px` : '85dvh',
  }
}
