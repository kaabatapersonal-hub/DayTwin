const CACHE_NAME = 'daytwin-shell-v1'
const SHELL_URLS = ['/today', '/habits', '/growth', '/friends', '/you']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// Offline fallback for navigation requests only.
// API routes, assets, and Next.js RSC payloads are never cached here.
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(r => r ?? caches.match('/today'))
    )
  )
})
