'use client'

import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from '@/components/ui/icons'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** Centered dialog on desktop, full-height sheet on phones. Esc and the backdrop close it. */
export function Modal({ title, onClose, children, footer }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[85dvh] flex flex-col bg-bar border border-line rounded-t-[22px] sm:rounded-card shadow-2xl"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line-soft">
          <h2 className="m-0 text-lg font-bold">{title}</h2>
          <div className="flex-1" />
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-control text-ink-dim hover:text-ink hover:bg-surface cursor-pointer"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line-soft">{footer}</div>}
      </div>
    </div>
  )
}
