'use client'

import { useEffect, type ReactNode } from 'react'

/**
 * Full-screen editor that slides up from the bottom on every screen size.
 * Esc closes it; page scroll is locked while it is open.
 */
export function FullSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 bg-bar flex flex-col motion-safe:animate-sheet-up">
      <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
        <span className="w-10 h-1 rounded-full bg-line-strong" />
      </div>
      {children}
    </div>
  )
}
