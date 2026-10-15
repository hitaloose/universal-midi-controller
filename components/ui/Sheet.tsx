'use client'

import type { ReactNode } from 'react'

/**
 * Inspector container: a side column from `lg` up, a bottom sheet with a backdrop below that.
 */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] rounded-t-[22px] border-t border-line bg-bar flex flex-col
          lg:sticky lg:top-[69px] lg:self-start lg:h-[calc(100dvh-69px)] lg:z-auto lg:max-h-none lg:rounded-none lg:border-t-0 lg:border-l lg:border-line-soft lg:w-[400px] lg:shrink-0"
      >
        <div className="lg:hidden flex justify-center pt-2.5 pb-1" aria-hidden="true">
          <span className="w-10 h-1 rounded-full bg-line-strong" />
        </div>
        {children}
      </aside>
    </>
  )
}
