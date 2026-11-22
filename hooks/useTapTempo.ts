'use client'

import { useCallback, useState } from 'react'
import { findClosestDelayMs } from '@/lib/pocketMasterDelayData'
import { computeBpmFromTaps } from '@/lib/utils'
import type { PresetTempo, Subdivision } from '@/lib/types'

export type { Subdivision }

const SUBDIVISION_CYCLE: Subdivision[] = ['eighth', 'dottedEighth', 'quarter']

export function calcDelayMs(bpm: number, subdivision: Subdivision): number {
  const quarter = 60000 / bpm
  if (subdivision === 'eighth') return quarter / 2
  if (subdivision === 'dottedEighth') return quarter * 0.75
  return quarter
}

const MAX_TAPS = 4
const TAP_TIMEOUT_MS = 3000

type UseTapTempoReturn = {
  isEnabled: boolean
  bpm: number | null
  subdivision: Subdivision
  delayMs: number | null
  closestMs: number | null
  tap: () => void
  cycleSubdivision: () => void
  setSubdivision: (s: Subdivision) => void
  disable: () => void
  /** Takes a preset's tempo, or turns tap delay off for a preset without one. */
  load: (tempo: PresetTempo | null) => void
}

export function useTapTempo(): UseTapTempoReturn {
  const [isEnabled, setIsEnabled] = useState(false)
  const [bpm, setBpm] = useState<number | null>(null)
  const [subdivision, setSubdivision] = useState<Subdivision>('eighth')
  const [tapTimes, setTapTimes] = useState<number[]>([])

  const delayMs = bpm !== null ? calcDelayMs(bpm, subdivision) : null
  const closestMs = delayMs !== null ? findClosestDelayMs(delayMs) : null

  const tap = useCallback(() => {
    const now = Date.now()
    setTapTimes((prev) => {
      const recent = [...prev.filter((t) => now - t < TAP_TIMEOUT_MS), now].slice(-MAX_TAPS)
      const newBpm = computeBpmFromTaps(recent)
      if (newBpm !== null) setBpm(newBpm)
      return recent
    })
    setIsEnabled(true)
  }, [])

  const cycleSubdivision = useCallback(() => {
    setSubdivision((prev) => {
      const idx = SUBDIVISION_CYCLE.indexOf(prev)
      return SUBDIVISION_CYCLE[(idx + 1) % SUBDIVISION_CYCLE.length]
    })
  }, [])

  const disable = useCallback(() => {
    setIsEnabled(false)
    setBpm(null)
    setTapTimes([])
  }, [])

  const load = useCallback((tempo: PresetTempo | null) => {
    setTapTimes([])
    setIsEnabled(tempo !== null)
    setBpm(tempo?.bpm ?? null)
    if (tempo) setSubdivision(tempo.subdivision)
  }, [])

  return { isEnabled, bpm, subdivision, delayMs, closestMs, tap, cycleSubdivision, setSubdivision, disable, load }
}
