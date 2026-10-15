'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Dev chunk URLs have no content hash, so the cache-first SW would keep serving
    // the first CSS/JS it saw. Remove any SW left from a previous visit instead.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(async (regs) => {
        if (regs.length === 0) return
        await Promise.all(regs.map((r) => r.unregister()))
        await Promise.all((await caches.keys()).filter((k) => k.startsWith('umc-')).map((k) => caches.delete(k)))
        window.location.reload()
      })
      return
    }

    navigator.serviceWorker
      .register('/universal-midi-controller/sw.js', {
        scope: '/universal-midi-controller/',
        updateViaCache: 'none',
      })
      .then((registration) => {
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update()
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        const intervalId = setInterval(() => registration.update(), 60 * 60 * 1000)

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })

        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange)
          clearInterval(intervalId)
        }
      })
  }, [])

  return null
}
