'use client'

import { useMemo, useState } from 'react'
import type { MidiMessage, MidiMessageType } from '@/lib/types'
import { formatLogTime, type LogType, type UseMidiLogReturn } from '@/hooks/useMidiLog'
import { MIDI_TYPES, clampNum } from '@/components/MidiFields'
import { Card, FieldLabel, Hint, SectionTitle, inputClass, monoInputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { StatusChip } from '@/components/ui/StatusChip'

type Filter = 'all' | LogType

const TYPE_COLOR: Record<LogType, string> = {
  PC: 'text-preset',
  CC: 'text-fx',
  Note: 'text-edit',
  SysEx: 'text-solo',
}

const COLS = 'grid grid-cols-[104px_44px_44px_64px_64px_56px_minmax(0,1fr)] gap-2'

type Props = {
  log: UseMidiLogReturn
  defaultChannel: number
  connected: boolean
  onSend: (msg: MidiMessage, source: string) => void
}

export function MonitorView({ log, defaultChannel, connected, onSend }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [channel, setChannel] = useState<'all' | number>('all')
  const [query, setQuery] = useState('')
  const [msg, setMsg] = useState<MidiMessage>({ channel: defaultChannel, type: 'controlChange', data1: 0, data2: 127 })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return log.entries
      .filter((e) => filter === 'all' || e.type === filter)
      .filter((e) => channel === 'all' || e.ch === channel)
      .filter((e) => !q || e.source.toLowerCase().includes(q))
      .slice()
      .reverse()
  }, [log.entries, filter, channel, query])

  return (
    <div className="p-4 sm:px-7 sm:py-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-2xl font-bold tracking-[-0.01em]">MIDI monitor</h1>
        {log.paused ? <StatusChip tone="dim">PAUSED</StatusChip> : <StatusChip tone="mint">LIVE</StatusChip>}
        <div className="flex-1" />
        <Button onClick={() => log.setPaused(!log.paused)}>{log.paused ? 'Resume' : 'Pause'}</Button>
        <Button onClick={log.clear}>Clear</Button>
        <Button onClick={log.exportLog} disabled={log.entries.length === 0}>
          Export log
        </Button>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <section aria-label="Log" className="flex-[2_1_560px] min-w-0 bg-surface border border-line-soft rounded-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-line-soft">
            <Segmented<Filter>
              label="Message type"
              size="sm"
              options={[
                { value: 'all', label: 'All' },
                { value: 'PC', label: 'PC' },
                { value: 'CC', label: 'CC' },
                { value: 'Note', label: 'Note' },
                { value: 'SysEx', label: 'SysEx' },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <label className="flex items-center gap-2">
              <span className="text-xs text-ink-dim">Channel</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="box-border h-[38px] rounded-lg border border-line bg-ground text-ink px-2.5 text-[13px] font-semibold"
              >
                <option value="all">All</option>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </label>
            <div className="flex-[1_1_40px]" />
            <input
              type="search"
              placeholder="Search source"
              aria-label="Search source"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="box-border flex-[0_1_200px] min-w-0 h-[38px] rounded-lg border border-line bg-ground text-ink px-3 text-[13px]"
            />
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className={`${COLS} px-4 py-2.5 bg-[#1A1D21] text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-dim`}>
                <span>Time</span><span>Dir</span><span>Ch</span><span>Type</span><span>D1</span><span>D2</span><span>Source</span>
              </div>
              <div className="max-h-[60dvh] overflow-y-auto">
                {rows.length === 0 ? (
                  <p className="m-0 px-4 py-8 text-center text-sm text-ink-dim">
                    {log.entries.length === 0 ? 'Nothing sent yet. Press a pad or send a message.' : 'No messages match the filters.'}
                  </p>
                ) : (
                  rows.map((e) => (
                    <div key={e.id} className={`${COLS} px-4 py-2.5 border-t border-[#1F2227] font-mono text-[13px] items-center`}>
                      <span className="text-ink-mute">{formatLogTime(e.time)}</span>
                      <span className="text-edit font-bold">TX</span>
                      <span>{e.ch ?? '-'}</span>
                      <span className={`font-bold ${TYPE_COLOR[e.type]}`}>{e.type}</span>
                      <span>{e.d1}</span>
                      <span>{e.d2}</span>
                      <span className="font-sans text-ink-dim truncate">{e.source}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="flex-[1_1_320px] md:max-w-[400px] min-w-0 flex flex-col gap-[18px]">
          <Card label="Send message">
            <SectionTitle>Send a message</SectionTitle>
            <Hint>Test a command on the pedal without creating a pad.</Hint>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Type</FieldLabel>
                <select
                  value={msg.type}
                  onChange={(e) => setMsg({ ...msg, type: e.target.value as MidiMessageType })}
                  className={`${inputClass} text-sm px-2.5`}
                >
                  {MIDI_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Channel</FieldLabel>
                <input type="number" min={1} max={16} value={msg.channel} onChange={(e) => setMsg({ ...msg, channel: clampNum(1, 16, e.target.value) })} className={monoInputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Data 1</FieldLabel>
                <input type="number" min={0} max={127} value={msg.data1} onChange={(e) => setMsg({ ...msg, data1: clampNum(0, 127, e.target.value) })} className={monoInputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Data 2</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={msg.data2}
                  disabled={msg.type === 'programChange'}
                  onChange={(e) => setMsg({ ...msg, data2: clampNum(0, 127, e.target.value) })}
                  className={`${monoInputClass} disabled:opacity-40`}
                />
              </label>
            </div>
            <Button variant="primary" className="h-12" disabled={!connected} onClick={() => onSend(msg, 'Manual')}>
              Send
            </Button>
            {!connected && <Hint>Connect a device in Settings to send.</Hint>}
          </Card>

          <Card label="Legend">
            <SectionTitle>Legend</SectionTitle>
            <div className="flex flex-col gap-2 text-[13px] text-ink-dim">
              <span className="flex items-center gap-2.5"><span className="font-mono font-bold text-preset min-w-11">PC</span>Program Change, switches preset</span>
              <span className="flex items-center gap-2.5"><span className="font-mono font-bold text-fx min-w-11">CC</span>Control Change, FX, presets and looper</span>
              <span className="flex items-center gap-2.5"><span className="font-mono font-bold text-edit min-w-11">Note</span>Note on/off</span>
              <span className="flex items-center gap-2.5"><span className="font-mono font-bold text-solo min-w-11">SysEx</span>Tap delay time</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
