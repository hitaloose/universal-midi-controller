import type { LogEntry } from '@/hooks/useMidiLog'

export function describeLogEntry(e: LogEntry): string {
  const ch = e.ch !== null ? `ch ${e.ch} · ` : ''
  const data = e.type === 'PC' ? `PC ${e.d1}` : e.type === 'SysEx' ? `SysEx ${e.d1}` : `${e.type} ${e.d1} = ${e.d2}`
  return `${ch}${data}${e.source ? ` · ${e.source}` : ''}`
}

type Props = { last: LogEntry | null; midiError: string | null }

export function StatusBar({ last, midiError }: Props) {
  return (
    <footer className="hidden md:flex sticky bottom-0 z-20 items-center gap-4 px-6 py-2.5 border-t border-line-soft bg-bar text-xs">
      <span className="flex items-center gap-2 text-ink-dim">
        <span className={`w-[7px] h-[7px] rounded-full ${last ? 'bg-fx' : 'bg-ink-mute'}`} />
        Last sent
      </span>
      <span className="font-mono text-ink truncate">{last ? describeLogEntry(last) : '—'}</span>
      <div className="flex-1" />
      <span className="text-ink-dim">Keyboard shortcuts active</span>
      <span className={midiError ? 'text-panic' : 'text-ink-dim'}>{midiError ?? 'Web MIDI ready'}</span>
    </footer>
  )
}
