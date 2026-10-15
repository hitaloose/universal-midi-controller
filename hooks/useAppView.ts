'use client'

import { useCallback, useEffect, useState } from 'react'

export type AppView = 'perform' | 'edit' | 'looper' | 'monitor' | 'settings'

const VIEWS: AppView[] = ['perform', 'edit', 'looper', 'monitor', 'settings']

function readHash(): AppView {
  const h = window.location.hash.replace('#', '') as AppView
  return VIEWS.includes(h) ? h : 'perform'
}

/** The current screen lives in the URL hash, so the whole app stays mounted (MIDI, looper clock, tap tempo). */
export function useAppView() {
  const [view, setViewState] = useState<AppView>(() => (typeof window === 'undefined' ? 'perform' : readHash()))

  useEffect(() => {
    const onHash = () => {
      setViewState(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setView = useCallback((v: AppView) => {
    if (v === 'perform') history.pushState(null, '', window.location.pathname + window.location.search)
    else window.location.hash = v
    setViewState(v)
    window.scrollTo(0, 0)
  }, [])

  return { view, setView }
}
