'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MidiMessage } from '@/lib/types'
import { downloadFile } from '@/lib/storage'

export type LogType = 'PC' | 'CC' | 'Note' | 'SysEx'

export type LogEntry = {
  id: number
  /** Date.now() */
  time: number
  ch: number | null
  type: LogType
  d1: string
  d2: string
  source: string
}

const MAX_ENTRIES = 500
const FLUSH_MS = 100

export function formatLogTime(time: number): string {
  const d = new Date(time)
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function entryFor(msg: MidiMessage): Pick<LogEntry, 'ch' | 'type' | 'd1' | 'd2'> {
  if (msg.type === 'programChange') return { ch: msg.channel, type: 'PC', d1: String(msg.data1), d2: '-' }
  if (msg.type === 'controlChange') return { ch: msg.channel, type: 'CC', d1: String(msg.data1), d2: String(msg.data2) }
  return { ch: msg.channel, type: 'Note', d1: String(msg.data1), d2: msg.type === 'noteOff' ? 'off' : String(msg.data2) }
}

export type UseMidiLogReturn = {
  entries: LogEntry[]
  last: LogEntry | null
  paused: boolean
  setPaused: (paused: boolean) => void
  clear: () => void
  exportLog: () => void
  logMessage: (msg: MidiMessage, source: string) => void
  logSysEx: (bytes: number[], source: string) => void
}

export function useMidiLog(): UseMidiLogReturn {
  // The buffer lives in a ref; the looper can send many messages per second and the
  // UI only needs a snapshot every FLUSH_MS.
  const bufferRef = useRef<LogEntry[]>([])
  const nextIdRef = useRef(1)
  const pausedRef = useRef(false)
  const dirtyRef = useRef(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [paused, setPausedState] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      setEntries([...bufferRef.current])
    }, FLUSH_MS)
    return () => clearInterval(id)
  }, [])

  const push = useCallback((entry: Omit<LogEntry, 'id' | 'time'>) => {
    if (pausedRef.current) return
    const buf = bufferRef.current
    buf.push({ ...entry, id: nextIdRef.current++, time: Date.now() })
    if (buf.length > MAX_ENTRIES) buf.splice(0, buf.length - MAX_ENTRIES)
    dirtyRef.current = true
  }, [])

  const logMessage = useCallback(
    (msg: MidiMessage, source: string) => push({ ...entryFor(msg), source }),
    [push],
  )

  const logSysEx = useCallback(
    (bytes: number[], source: string) => push({ ch: null, type: 'SysEx', d1: `${bytes.length} B`, d2: '-', source }),
    [push],
  )

  const setPaused = useCallback((value: boolean) => {
    pausedRef.current = value
    setPausedState(value)
  }, [])

  const clear = useCallback(() => {
    bufferRef.current = []
    setEntries([])
  }, [])

  const exportLog = useCallback(() => {
    const lines = bufferRef.current.map((e) =>
      [formatLogTime(e.time), 'TX', e.ch ?? '-', e.type, e.d1, e.d2, e.source].join('\t'),
    )
    const header = ['Time', 'Dir', 'Ch', 'Type', 'D1', 'D2', 'Source'].join('\t')
    downloadFile('midi-log.tsv', [header, ...lines].join('\n'), 'text/tab-separated-values')
  }, [])

  return {
    entries,
    last: entries.length > 0 ? entries[entries.length - 1] : null,
    paused,
    setPaused,
    clear,
    exportLog,
    logMessage,
    logSysEx,
  }
}
