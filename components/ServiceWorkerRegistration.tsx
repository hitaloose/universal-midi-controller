'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/universal-midi-controller/sw.js', {
        scope: '/universal-midi-controller/',
        updateViaCache: 'none',
      })
    }
  }, [])

  return null
}
