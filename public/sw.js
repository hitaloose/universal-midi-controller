const CACHE_NAME = 'umc-v1'
const STATIC_CACHE = 'umc-static-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/'))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Assets estáticos do Next.js → Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/static/')
  ) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone))
            return res
          })
      )
    )
    return
  }

  // Navegação (HTML) → Network-First com fallback offline
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          return res
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/'))
        )
    )
    return
  }

  // Demais recursos → Cache-First
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
