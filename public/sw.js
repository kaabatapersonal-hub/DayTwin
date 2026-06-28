// Minimal service worker — makes the app installable as a PWA.
//
// The app routes (/today, /habits, etc.) all use force-dynamic and serve
// user-specific data, so they must never be pre-cached. Pre-caching them
// caused stale auth-scoped snapshots to appear after a service-worker update
// (skipWaiting + clients.claim took over mid-session and briefly served the
// old cached response, making users think their data was gone).

const CACHE_NAME = 'daytwin-shell-v2'

self.addEventListener('install', () => {
  // Skip the "waiting" phase so the new SW activates immediately after install.
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  // Delete ALL old caches (including the v1 shell cache with the pre-cached
  // force-dynamic pages that was causing the stale-data problem).
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// No fetch handler — every request goes straight to the network.
// This means the app won't work offline, which is the correct trade-off
// for a realtime personal-data app where stale data is worse than no data.
