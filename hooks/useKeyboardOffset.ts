'use client'

import { useEffect, useState } from 'react'

/**
 * Returns the current on-screen keyboard height in pixels.
 * Uses visualViewport.resize/scroll events — the only reliable way to detect
 * the software keyboard in iOS Safari PWA mode.
 *
 * Also locks document.body overflow while the calling component is mounted,
 * preventing iOS from scrolling the background page while a bottom sheet is open.
 * Use in every bottom-sheet component that has focusable inputs.
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    // Lock body scroll for the lifetime of the calling sheet
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const vv = window.visualViewport
    if (!vv) {
      return () => { document.body.style.overflow = prevOverflow }
    }

    const update = () => {
      // keyboard height = gap between layout viewport bottom and visual viewport bottom
      const kh = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      setOffset(kh)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      document.body.style.overflow = prevOverflow
    }
  }, [])

  return offset
}
