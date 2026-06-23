'use client'

import { useSound } from '@/contexts/SoundContext'

/**
 * Persistent mini-player shown above the bottom nav while a sound pack is loaded.
 * Returns null when no sound is active — zero height, no layout space.
 *
 * Positioned fixed at the bottom so it sits just above the nav bar without
 * pushing page content. This matches the design pattern of the TrackingBar
 * (which sticks to the top when a manual timer is running).
 */
export function SoundBar() {
  const { activeSoundName, isPlaying, pause, stop } = useSound()

  if (!activeSoundName) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-between px-5 h-10 bg-background border-t border-white/[0.06]">
      <div className="flex items-center gap-2">
        {isPlaying && (
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse inline-block" />
        )}
        <span className="text-xs font-body text-white/60">{activeSoundName}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Pause / Resume */}
        <button
          onClick={isPlaying ? pause : () => {}}
          className="w-7 h-7 flex items-center justify-center text-white/50 active:text-white/80 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Resume'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          className="w-7 h-7 flex items-center justify-center text-white/50 active:text-white/80 transition-colors"
          aria-label="Stop sound"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
