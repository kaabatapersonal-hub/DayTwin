'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  loadFutureMe, saveFutureMe, deleteFutureMe, exportFutureMe,
  bestAudioMime, bestVideoMime, MAX_DURATION_MS,
  type FutureMeRecord,
} from '@/lib/future-me'
import { formatDuration } from '@/lib/format'

interface FutureMeProps {
  goalId:    string
  goalTitle: string
}

type Mode = 'idle' | 'recording-voice' | 'recording-video' | 'writing' | 'playing'

// IndexedDB only — zero Supabase calls, zero network requests; 2-minute cap enforced by setTimeout
export function FutureMe({ goalId, goalTitle }: FutureMeProps) {
  const [entry,       setEntry]       = useState<FutureMeRecord | null>(null)
  const [mode,        setMode]        = useState<Mode>('idle')
  const [elapsedMs,   setElapsedMs]   = useState(0)
  const [writeText,   setWriteText]   = useState('')
  const [audioUrl,    setAudioUrl]    = useState<string | null>(null)
  const [videoUrl,    setVideoUrl]    = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  const recorderRef   = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef  = useRef<number>(0)
  const autoStopRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoElRef    = useRef<HTMLVideoElement>(null)
  const liveVideoRef  = useRef<HTMLVideoElement>(null)

  // Load any existing entry from IndexedDB on mount
  useEffect(() => {
    loadFutureMe(goalId)
      .then(rec => {
        if (!rec) return
        setEntry(rec)
        if (rec.blob) {
          const url = URL.createObjectURL(rec.blob)
          if (rec.type === 'video') setVideoUrl(url)
          else setAudioUrl(url)
        }
        if (rec.type === 'text') setWriteText(rec.text ?? '')
      })
      .catch(() => { /* IndexedDB unavailable — degrade silently */ })

    return () => {
      // Clean up object URLs on unmount
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId])

  // Tick the elapsed timer while recording
  useEffect(() => {
    if (mode === 'recording-voice' || mode === 'recording-video') {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(
        () => setElapsedMs(Date.now() - startTimeRef.current),
        250,
      )
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setElapsedMs(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [mode])

  function clearAutoStop() {
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null }
  }

  // ── Voice recording ──────────────────────────────────────────────────────────

  const startVoice = useCallback(async () => {
    setError(null)
    try {
      const stream  = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime    = bestAudioMime()
      const rec     = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        clearAutoStop()
        const durationMs = Date.now() - startTimeRef.current
        const blob = new Blob(chunksRef.current, { type: mime })
        const record: FutureMeRecord = { goalId, type: 'voice', blob, text: null, recordedAt: new Date().toISOString(), durationMs }
        await saveFutureMe(record)
        setEntry(record)
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(blob))
        setMode('idle')
      }

      recorderRef.current = rec
      rec.start()
      setMode('recording-voice')
      // Auto-stop at 2 minutes
      autoStopRef.current = setTimeout(() => rec.stop(), MAX_DURATION_MS)
    } catch {
      setError('Could not access microphone. Please allow microphone access and try again.')
    }
  }, [goalId, audioUrl])

  const stopVoice = useCallback(() => {
    recorderRef.current?.stop()
  }, [])

  // ── Video recording ──────────────────────────────────────────────────────────

  const startVideo = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } })
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        liveVideoRef.current.play()
      }
      const mime = bestVideoMime()
      const rec  = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null
        clearAutoStop()
        const durationMs = Date.now() - startTimeRef.current
        const blob = new Blob(chunksRef.current, { type: mime })
        const record: FutureMeRecord = { goalId, type: 'video', blob, text: null, recordedAt: new Date().toISOString(), durationMs }
        await saveFutureMe(record)
        setEntry(record)
        if (videoUrl) URL.revokeObjectURL(videoUrl)
        setVideoUrl(URL.createObjectURL(blob))
        setMode('idle')
      }

      recorderRef.current = rec
      rec.start()
      setMode('recording-video')
      autoStopRef.current = setTimeout(() => rec.stop(), MAX_DURATION_MS)
    } catch {
      setError('Could not access camera/microphone. Please allow access and try again.')
    }
  }, [goalId, videoUrl])

  const stopVideo = useCallback(() => {
    recorderRef.current?.stop()
  }, [])

  // ── Text save ────────────────────────────────────────────────────────────────

  const saveText = useCallback(async () => {
    const trimmed = writeText.trim()
    if (!trimmed) return
    const record: FutureMeRecord = {
      goalId, type: 'text', blob: null, text: trimmed,
      recordedAt: new Date().toISOString(), durationMs: null,
    }
    await saveFutureMe(record)
    setEntry(record)
    setMode('idle')
  }, [goalId, writeText])

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    await deleteFutureMe(goalId)
    setEntry(null)
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null) }
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null) }
    setWriteText('')
    setMode('idle')
  }, [goalId, audioUrl, videoUrl])

  // ── Render ───────────────────────────────────────────────────────────────────

  const remainingMs = Math.max(0, MAX_DURATION_MS - elapsedMs)
  const isRecording = mode === 'recording-voice' || mode === 'recording-video'

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-xs font-body text-white/40 uppercase tracking-widest">Future Me</h3>
        {!entry && (
          <span className="text-[10px] font-body text-white/20">Stays on this device only</span>
        )}
      </div>

      {/* Device-only notice when an entry exists */}
      {entry && (
        <p className="text-[10px] font-body text-white/20 mb-3">
          Stored on this device only · never uploaded
        </p>
      )}

      {error && <p className="text-xs text-red-400 font-body mb-3">{error}</p>}

      {/* ── No entry yet ─────────────────────────────────────────── */}
      {!entry && mode === 'idle' && (
        <div className="bg-white/[0.03] rounded-2xl p-4 text-center">
          <p className="text-sm text-white/40 font-body mb-4 leading-relaxed">
            Record a message for the version of you that will live this goal.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={startVoice}
              className="w-full py-3 rounded-xl bg-white/8 text-white/70 text-sm font-body flex items-center justify-center gap-2 active:bg-white/15">
              <span>🎙</span> Record voice
            </button>
            <button onClick={() => setMode('writing')}
              className="w-full py-3 rounded-xl bg-white/8 text-white/70 text-sm font-body flex items-center justify-center gap-2 active:bg-white/15">
              <span>✍️</span> Write instead
            </button>
            <button onClick={startVideo}
              className="w-full py-2.5 rounded-xl text-white/30 text-xs font-body active:text-white/50">
              Record video (optional)
            </button>
          </div>
        </div>
      )}

      {/* ── Recording in progress ────────────────────────────────── */}
      {isRecording && (
        <div className="bg-white/[0.03] rounded-2xl p-4 text-center">
          {mode === 'recording-video' && (
            <video ref={liveVideoRef} muted playsInline
              className="w-full aspect-video rounded-xl bg-black mb-4 object-cover" />
          )}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-body text-white/70 tabular-nums">
              {formatDuration(Math.floor(elapsedMs / 1000))}
            </span>
            <span className="text-xs font-body text-white/30">
              / {formatDuration(Math.floor(MAX_DURATION_MS / 1000))} max
            </span>
          </div>
          <p className="text-xs font-body text-white/25 mb-4">
            {formatDuration(Math.floor(remainingMs / 1000))} remaining
          </p>
          <button
            onClick={mode === 'recording-video' ? stopVideo : stopVoice}
            className="px-8 py-3 rounded-2xl bg-red-500/20 text-red-400 text-sm font-body active:scale-95">
            Stop recording
          </button>
        </div>
      )}

      {/* ── Write mode ───────────────────────────────────────────── */}
      {mode === 'writing' && (
        <div className="bg-white/[0.03] rounded-2xl p-4">
          <textarea
            value={writeText}
            onChange={e => setWriteText(e.target.value)}
            placeholder="Write your message to future you..."
            rows={5}
            autoFocus
            className="w-full bg-transparent text-white placeholder-white/25 text-sm font-body focus:outline-none resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setMode('idle')}
              className="px-4 py-2.5 rounded-xl bg-white/8 text-white/50 text-sm font-body">
              Cancel
            </button>
            <button onClick={saveText} disabled={!writeText.trim()}
              className="flex-1 py-2.5 rounded-xl bg-teal text-background text-sm font-body font-medium disabled:opacity-40">
              Save message
            </button>
          </div>
        </div>
      )}

      {/* ── Existing entry playback ───────────────────────────────── */}
      {entry && mode === 'idle' && (
        <div className="bg-white/[0.03] rounded-2xl p-4">
          <p className="text-[10px] font-body text-white/30 mb-3">
            Recorded {new Date(entry.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {entry.durationMs ? ` · ${formatDuration(Math.round(entry.durationMs / 1000))}` : ''}
          </p>

          {entry.type === 'voice' && audioUrl && (
            <audio controls src={audioUrl} className="w-full mb-3" style={{ colorScheme: 'dark' }} />
          )}
          {entry.type === 'video' && videoUrl && (
            <video ref={videoElRef} controls src={videoUrl}
              className="w-full aspect-video rounded-xl bg-black mb-3 object-cover" />
          )}
          {entry.type === 'text' && (
            <p className="text-sm font-body text-white/70 leading-relaxed mb-3 whitespace-pre-wrap">
              {entry.text}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => exportFutureMe(entry, goalTitle)}
              className="flex-1 py-2.5 rounded-xl bg-white/8 text-white/60 text-xs font-body active:bg-white/15">
              Export
            </button>
            <button
              onClick={() => entry.type === 'video' ? startVideo() : entry.type === 'text' ? setMode('writing') : startVoice()}
              className="flex-1 py-2.5 rounded-xl bg-white/8 text-white/60 text-xs font-body active:bg-white/15">
              Re-record
            </button>
            <button onClick={handleDelete}
              className="py-2.5 px-3 rounded-xl bg-red-500/10 text-red-400 text-xs font-body active:bg-red-500/20">
              Delete
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
