'use client'

import { Logo } from '@/components/ui/icons'
import type { ConnectionInfo } from '@/hooks/useOutput'

type Props = {
  setupName: string
  connection: ConnectionInfo
  onConnectionClick: () => void
  onPanic: () => void
}

export function TopBar({ setupName, connection, onConnectionClick, onPanic }: Props) {
  const connected = connection.kind !== 'none'
  const label =
    connection.kind === 'usb'
      ? `USB · ${connection.name}`
      : connection.kind === 'bluetooth'
        ? `BT · ${connection.name}`
        : 'No device'

  return (
    <header className="sticky top-0 z-30 box-border flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-line-soft bg-bar">
      <div className="flex items-center gap-3 min-w-0">
        <Logo />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[15px] font-bold truncate">Universal MIDI Controller</span>
          <span className="text-xs text-ink-dim truncate">Setup: {setupName}</span>
        </div>
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onConnectionClick}
        aria-label={`Connection: ${label}. Open settings`}
        className="hidden sm:flex items-center gap-2.5 bg-[#1A1D21] border border-line rounded-full py-[7px] pl-3 pr-3.5 cursor-pointer hover:border-line-strong min-w-0"
      >
        <span
          className={`w-[9px] h-[9px] rounded-full shrink-0 ${
            connected ? 'bg-fx shadow-[0_0_0_4px_rgba(61,220,151,0.18)]' : 'bg-ink-mute'
          }`}
        />
        <span className="text-[13px] font-semibold truncate max-w-[220px]">{label}</span>
      </button>
      <button
        type="button"
        onClick={onConnectionClick}
        aria-label={`Connection: ${label}. Open settings`}
        className="sm:hidden w-11 h-11 flex items-center justify-center rounded-control border border-line bg-[#1A1D21]"
      >
        <span className={`w-[10px] h-[10px] rounded-full ${connected ? 'bg-fx shadow-[0_0_0_4px_rgba(61,220,151,0.18)]' : 'bg-ink-mute'}`} />
      </button>
      <button
        type="button"
        onClick={onPanic}
        aria-label="Panic: all notes off"
        className="flex items-center min-h-11 rounded-control px-3.5 bg-rec/12 border border-rec/50 text-panic text-[13px] font-bold tracking-[0.04em] cursor-pointer hover:bg-rec/20"
      >
        PANIC
      </button>
    </header>
  )
}
