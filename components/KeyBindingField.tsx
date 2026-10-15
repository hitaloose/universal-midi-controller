'use client'

import { useEffect, useState } from 'react'

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return `Num${code.slice(6)}`
  const map: Record<string, string> = {
    Space: 'Space',
    Enter: 'Enter',
    Backspace: '⌫',
    Tab: 'Tab',
    Escape: 'Esc',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ShiftLeft: 'Shift ←',
    ShiftRight: 'Shift →',
    ControlLeft: 'Ctrl ←',
    ControlRight: 'Ctrl →',
    AltLeft: 'Alt ←',
    AltRight: 'Alt →',
  }
  return map[code] ?? code
}

type Props = {
  label?: string
  value: string | undefined
  usedKeys: Set<string>
  onChange: (code: string | undefined) => void
}

export function KeyBindingField({ label = 'Keyboard key', value, usedKeys, onChange }: Props) {
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    if (!isCapturing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsCapturing(false)
      if (e.code !== 'Escape') onChange(e.code)
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [isCapturing, onChange])

  const conflict = value !== undefined && usedKeys.has(value)
  const small =
    'h-9 px-3 rounded-lg border border-line bg-surface-2 text-ink text-[13px] font-semibold cursor-pointer hover:bg-line-soft'

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-dim">{label}</span>
      <div className="flex items-center gap-2 flex-wrap min-h-9">
        {isCapturing ? (
          <button
            type="button"
            onClick={() => setIsCapturing(false)}
            className="h-9 px-3 rounded-lg border border-preset bg-preset/10 text-preset text-[13px] font-semibold animate-pulse cursor-pointer"
          >
            Press a key… (Esc to cancel)
          </button>
        ) : value !== undefined ? (
          <>
            <span className="font-mono text-[15px] font-bold min-w-9 text-center px-2 py-1 rounded-lg border border-line bg-ground">
              {formatKeyCode(value)}
            </span>
            <button type="button" onClick={() => setIsCapturing(true)} className={small}>
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="h-9 px-2 text-[13px] text-ink-dim hover:text-panic cursor-pointer"
            >
              Remove
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setIsCapturing(true)} className={small}>
            Set key
          </button>
        )}
      </div>
      {conflict && <span className="text-xs text-preset">Key already used by another control</span>}
    </div>
  )
}
