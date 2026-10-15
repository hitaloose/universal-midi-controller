'use client'

import type { LooperConfig } from '@/lib/types'
import type { UseLooperReturn } from '@/hooks/useLooper'
import { loopDurationSec } from '@/lib/looper'
import { Card, SectionTitle } from '@/components/ui/Card'
import { StatusChip } from '@/components/ui/StatusChip'
import { BeatDots, LooperTransport, STATE_LABELS, stateTone, useBeat } from '@/components/looper/shared'
import { PowerIcon, SpeakerIcon, SpeakerOffIcon } from '@/components/ui/icons'

type Props = {
  looper: UseLooperReturn
  config: LooperConfig
  onOpen: () => void
}

export function LooperMiniCard({ looper, config, onOpen }: Props) {
  const beat = useBeat(looper)
  const isOff = looper.state === 'off'
  const ratio = Math.min(1, loopDurationSec(config) / config.maxRecSeconds)

  return (
    <Card label="Looper">
      <div className="flex items-center gap-2.5">
        <SectionTitle>Looper</SectionTitle>
        <StatusChip tone={stateTone(looper.state)} pulse={looper.state === 'recording'}>
          {STATE_LABELS[looper.state].toUpperCase()}
        </StatusChip>
        <div className="flex-1" />
        <a
          href="#looper"
          onClick={(e) => {
            e.preventDefault()
            onOpen()
          }}
          className="text-[13px] font-semibold text-preset no-underline hover:underline"
        >
          Open →
        </a>
      </div>
      {isOff ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-ink-dim">
            <span className="font-mono text-ink">{config.bpm} BPM · {config.beatsPerBar}/{config.beatUnit}</span> · {config.bars} bars
          </span>
          <button
            type="button"
            onClick={looper.toggle}
            className="h-11 px-4 rounded-control border border-line bg-surface-2 text-ink text-[13px] font-semibold cursor-pointer hover:bg-line-soft"
          >
            Turn on
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-0.5 font-mono">
              <span className="text-[40px] font-bold leading-none">{beat?.loopBar ?? '-'}</span>
              <span className="text-lg text-ink-dim">/{config.bars}</span>
            </div>
            <BeatDots beat={beat} beatsPerBar={config.beatsPerBar} size={12} />
            <span className="ml-auto font-mono text-xs text-ink-dim">
              {config.bpm} BPM · {config.beatsPerBar}/{config.beatUnit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-line-soft overflow-hidden" aria-hidden="true">
            <div className={`h-full ${looper.isOverflow ? 'bg-rec' : 'bg-fx'}`} style={{ width: `${ratio * 100}%` }} />
          </div>
          <LooperTransport looper={looper} bindings={config.bindings} size="sm" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={config.clickEnabled}
              onClick={looper.toggleClick}
              className={`flex items-center gap-2 h-11 px-3.5 rounded-control border text-[13px] font-semibold cursor-pointer ${
                config.clickEnabled ? 'border-preset bg-preset/14 text-preset' : 'border-line bg-surface-2 text-ink-dim hover:text-ink'
              }`}
            >
              {config.clickEnabled ? <SpeakerIcon size={18} /> : <SpeakerOffIcon size={18} />}
              {config.clickEnabled ? 'Click on' : 'Click off'}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={looper.toggle}
              className="flex items-center gap-2 h-11 px-3.5 rounded-control border border-line bg-surface-2 text-ink text-[13px] font-semibold cursor-pointer hover:bg-line-soft"
            >
              <PowerIcon size={16} />
              Turn off
            </button>
          </div>
        </>
      )}
    </Card>
  )
}
