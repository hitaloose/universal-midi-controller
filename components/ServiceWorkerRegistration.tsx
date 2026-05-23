'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

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
