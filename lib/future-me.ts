/**
 * Future Me — IndexedDB storage for per-goal voice/text/video recordings.
 *
 * PRIVACY GUARANTEE: This module only touches IndexedDB (localStorage-tier).
 * It imports nothing from Supabase and makes zero network requests.
 * Future Me recordings must never leave the user's device — confirmed by design:
 * there is no Supabase table for them, and this module has no HTTP calls.
 *
 * Recordings are keyed by goal ID so re-recording a new message replaces the old one.
 */

const DB_NAME  = 'daytwin_local'
const DB_VER   = 1
const STORE    = 'future_me'

export type FutureMeType = 'voice' | 'text' | 'video'

export interface FutureMeRecord {
  goalId:      string       // IndexedDB key
  type:        FutureMeType
  blob:        Blob | null  // voice/video recordings; null for text
  text:        string | null
  recordedAt:  string       // ISO timestamp
  durationMs:  number | null
}

/** 2-minute cap on all recordings to prevent storage bloat and encourage conciseness. */
export const MAX_DURATION_MS = 2 * 60 * 1000

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'goalId' })
      }
    }
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror   = e => reject((e.target as IDBOpenDBRequest).error)
  })
}

/** Save (or overwrite) the Future Me entry for a goal. */
export async function saveFutureMe(record: FutureMeRecord): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put(record)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/** Load the Future Me entry for a goal, or null if none exists. */
export async function loadFutureMe(goalId: string): Promise<FutureMeRecord | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(goalId)
    req.onsuccess = () => resolve((req.result as FutureMeRecord) ?? null)
    req.onerror   = () => reject(req.error)
  })
}

/** Delete the Future Me entry for a goal. */
export async function deleteFutureMe(goalId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(goalId)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/**
 * Trigger a browser download of the Future Me recording or text.
 * Voice/video downloads as .webm; text as .txt.
 * This is the only "export" path — data still never leaves via network.
 */
export function exportFutureMe(record: FutureMeRecord, goalTitle: string): void {
  const safeName = goalTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const filename = `future-me-${safeName}`

  if (record.type === 'text' && record.text) {
    const blob = new Blob([record.text], { type: 'text/plain' })
    triggerDownload(blob, `${filename}.txt`)
    return
  }

  if (record.blob) {
    const ext = record.type === 'video' ? 'webm' : 'webm'
    triggerDownload(record.blob, `${filename}.${ext}`)
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Returns the best supported MIME type for audio recording on this device.
 * Safari/iOS needs audio/mp4; Chrome/Android prefers audio/webm.
 */
export function bestAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a']
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? 'audio/webm'
}

/** Returns the best supported MIME type for video recording. */
export function bestVideoMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm'
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4']
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
}
