'use client'

import {
  createContext, useContext, useRef, useState, useCallback,
} from 'react'

interface SoundContextValue {
  activeSoundId:   string | null
  activeSoundName: string | null
  isPlaying:       boolean
  /** Start playing a sound pack. If the same pack is playing, does nothing. */
  play: (soundId: string, soundName: string, audioUrl: string) => void
  pause: () => void
  stop:  () => void
}

const SoundContext = createContext<SoundContextValue>({
  activeSoundId:   null,
  activeSoundName: null,
  isPlaying:       false,
  play:  () => {},
  pause: () => {},
  stop:  () => {},
})

export function useSound() {
  return useContext(SoundContext)
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [activeSoundId,   setActiveSoundId]   = useState<string | null>(null)
  const [activeSoundName, setActiveSoundName] = useState<string | null>(null)
  const [isPlaying,       setIsPlaying]       = useState(false)

  const play = useCallback((soundId: string, soundName: string, audioUrl: string) => {
    // If already playing the same pack, do nothing
    if (activeSoundId === soundId && isPlaying) return

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    const audio = new Audio(audioUrl)
    audio.loop   = true
    audio.volume = 0.5

    audio.onerror = () => {
      // File not present — show "coming soon" state by resetting
      setActiveSoundId(null)
      setActiveSoundName(null)
      setIsPlaying(false)
    }

    audio.oncanplay = () => {
      audio.play().catch(() => {
        // Autoplay policy blocked — user must interact first
        setIsPlaying(false)
      })
      setIsPlaying(true)
    }

    audioRef.current = audio
    setActiveSoundId(soundId)
    setActiveSoundName(soundName)

    // Load triggers oncanplay or onerror
    audio.load()
  }, [activeSoundId, isPlaying])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setActiveSoundId(null)
    setActiveSoundName(null)
    setIsPlaying(false)
  }, [])

  return (
    <SoundContext.Provider value={{
      activeSoundId, activeSoundName, isPlaying, play, pause, stop,
    }}>
      {children}
    </SoundContext.Provider>
  )
}
