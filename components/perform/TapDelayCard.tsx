'use client'

import { useEffect, useRef, useState } from 'react'
import type { Subdivision } from '@/hooks/useTapTempo'
import type { TapTempoBindings } from '@/lib/types'
import { KeyBindingField } from '@/components/KeyBindingField'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { StatusChip } from '@/components/ui/StatusChip'
import { KeyCap } from '@/components/ui/KeyCap'
import { GearIcon } from '@/components/ui/icons'

const SUBDIVISIONS: { value: Subdivision; label: string }[] = [
  { value: 'eighth', label: '1/8' },
  { value: 'dottedEighth', label: 'Dotted 1/8' },
  { value: 'quarter', label: '1/4' },
]

type Props = {
  isEnabled: boolean
  bpm: number | null
  subdivision: Subdivision
  delayMs: number | null
  closestMs: number | null
  onTap: () => void
  onSetSubdivision: (s: Subdivision) => void
  onDisable: () => void
  bindings: TapTempoBindings
  onUpdateBindings: (b: TapTempoBindings) => void
  otherUsedKeys: Set<string>
  /** Mobile shows a single compact strip. */
  compact?: boolean
}

function useBeatFlash(isEnabled: boolean, bpm: number | null) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const off = () => {
      el.style.background = 'rgba(26,18,0,0.25)'
      el.style.boxShadow = 'none'
    }
    off()
    if (!isEnabled || !bpm) return
    let t: ReturnType<typeof setTimeout> | null = null
    const id = setInterval(() => {
      el.style.background = '#1A1200'
      el.style.boxShadow = '0 0 0 3px rgba(26,18,0,0.25)'
      t = setTimeout(off, 80)
    }, 60000 / bpm)
    return () => {
      clearInterval(id)
      if (t) clearTimeout(t)
    }
  }, [isEnabled, bpm])
  return ref
}

export function TapDelayCard(props: Props) {
  const { isEnabled, bpm, subdivision, delayMs, closestMs, onTap, onSetSubdivision, onDisable, bindings, compact } = props
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const flashRef = useBeatFlash(isEnabled, bpm)
  const ms = closestMs ?? (delayMs !== null ? Math.round(delayMs) : null)

  const tapButton = (
    <button
      type="button"
      onClick={onTap}
      className={`relative shrink-0 flex flex-col items-center justify-center rounded-pad border cursor-pointer select-none ${
        compact ? 'w-[92px] h-[92px]' : 'w-[132px] h-[132px]'
      } ${isEnabled ? 'bg-preset border-preset-hi text-preset-ink' : 'bg-surface-2 border-line text-ink'}`}
    >
      <span ref={flashRef} aria-hidden="true" className="absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full" />
      <span className="text-[13px] font-bold tracking-[0.14em]">TAP</span>
      <span className={`font-mono font-bold leading-none ${compact ? 'text-[28px]' : 'text-[40px]'}`}>{bpm ?? '--'}</span>
      <span className="text-[11px] font-bold tracking-[0.1em] opacity-70">BPM</span>
    </button>
  )

  if (compact) {
    return (
      <section aria-label="Tap delay" className="flex items-center gap-3.5 bg-surface border border-line-soft rounded-card p-3">
        {tapButton}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <span className="text-[13px] text-ink-dim">
            Tap delay · <span className="font-mono font-bold text-ink">{ms !== null ? `${ms} ms` : 'off'}</span>
          </span>
          <Segmented
            label="Subdivision"
            size="sm"
            options={SUBDIVISIONS.map((s) => ({ ...s, label: s.value === 'dottedEighth' ? 'Dotted' : s.label }))}
            value={subdivision}
            onChange={onSetSubdivision}
          />
        </div>
      </section>
    )
  }

  const keyUsed = (except: keyof TapTempoBindings) =>
    new Set([
      ...props.otherUsedKeys,
      ...(Object.entries(bindings) as [keyof TapTempoBindings, string | undefined][])
        .filter(([k, v]) => k !== except && v)
        .map(([, v]) => v!),
    ])

  return (
    <Card label="Tap delay">
      <div className="flex items-center gap-2.5 min-w-0">
        <SectionTitle className="whitespace-nowrap shrink-0">Tap delay</SectionTitle>
        <span className="text-xs text-ink-dim whitespace-nowrap truncate min-w-0">Pocket Master</span>
        <div className="flex-1" />
        <span className="shrink-0 whitespace-nowrap">
          {isEnabled ? <StatusChip tone="mint">ACTIVE</StatusChip> : <StatusChip tone="dim">OFF</StatusChip>}
        </span>
        <button
          type="button"
          aria-label="Tap delay keys"
          aria-expanded={isConfigOpen}
          onClick={() => setIsConfigOpen((v) => !v)}
          className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer ${isConfigOpen ? 'text-preset bg-line-soft' : 'text-ink-dim hover:text-ink'}`}
        >
          <GearIcon size={18} />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          {tapButton}
          <KeyCap code={bindings.tap} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-dim">Delay time</span>
            <span className="font-mono text-[32px] font-bold leading-tight">
              {ms ?? '--'}
              <span className="text-base text-ink-dim"> ms</span>
            </span>
            <span className="text-xs text-ink-dim whitespace-nowrap">Sent after 0.5 s</span>
          </div>
          <button
            type="button"
            onClick={onDisable}
            disabled={!isEnabled}
            className="self-start h-9 px-3.5 rounded-lg border border-line bg-surface-2 text-ink text-[13px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Turn off <KeyCap code={bindings.disable} className="ml-1" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Segmented label="Subdivision" options={SUBDIVISIONS} value={subdivision} onChange={onSetSubdivision} className="flex-1" />
        <KeyCap code={bindings.cycleSubdivision} />
      </div>

      {isConfigOpen && (
        <div className="flex flex-col gap-4 border-t border-line-soft pt-3.5">
          <KeyBindingField
            label="TAP key"
            value={bindings.tap}
            usedKeys={keyUsed('tap')}
            onChange={(code) => props.onUpdateBindings({ ...bindings, tap: code })}
          />
          <KeyBindingField
            label="Next subdivision key"
            value={bindings.cycleSubdivision}
            usedKeys={keyUsed('cycleSubdivision')}
            onChange={(code) => props.onUpdateBindings({ ...bindings, cycleSubdivision: code })}
          />
          <KeyBindingField
            label="Turn off key"
            value={bindings.disable}
            usedKeys={keyUsed('disable')}
            onChange={(code) => props.onUpdateBindings({ ...bindings, disable: code })}
          />
        </div>
      )}
    </Card>
  )
}
