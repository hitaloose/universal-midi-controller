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
  value: string | undefined
  usedKeys: Set<string>
  onChange: (code: string | undefined) => void
}

export function KeyBindingField({ value, usedKeys, onChange }: Props) {
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    if (!isCapturing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsCapturing(false)
      onChange(e.code)
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [isCapturing, onChange])

  const conflict = value !== undefined && usedKeys.has(value)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Keyboard key
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {isCapturing ? (
          <button
            onClick={() => setIsCapturing(false)}
            className="bg-indigo-900 border border-indigo-500 rounded px-3 py-1.5 text-sm text-indigo-200 animate-pulse"
          >
            Press a key… (click to cancel)
          </button>
        ) : value !== undefined ? (
          <>
            <span className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm font-mono text-white">
              {formatKeyCode(value)}
            </span>
            <button
              onClick={() => setIsCapturing(true)}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Change
            </button>
            <button
              onClick={() => onChange(undefined)}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsCapturing(true)}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 transition-colors"
          >
            Set key
          </button>
        )}
      </div>
      {conflict && (
        <span className="text-xs text-yellow-500">⚠ Key already used by another pad</span>
      )}
    </div>
  )
}
