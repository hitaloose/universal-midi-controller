'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LooperConfig, MidiMessage } from '@/lib/types'
import { beatDurationSec, loopDurationSec } from '@/lib/looper'
import { computeBpmFromTaps } from '@/lib/utils'

export type LooperState =
  | 'off'
  | 'empty'
  | 'armedRec'
  | 'recording'
  | 'playing'
  | 'armedOverdub'
  | 'overdubbing'
  | 'armedStop'
  | 'stopped'
  | 'armedPlay'

export type BeatInfo = {
  beatInBar: number // 0-based
  beatsPerBar: number
  loopBar: number | null // 1-based bar inside the loop, null when there is no loop running
  bars: number
}

type BeatListener = (info: BeatInfo) => void

type Machine = {
  state: LooperState
  anchorBeat: number // absolute beat index where the loop starts
  endBeat: number // absolute beat index where the current rec/overdub ends
}

// Scheduler: wakes every TICK_MS and schedules everything that falls inside LOOKAHEAD_SEC.
// The lookahead must be larger than latencyCompMs, so the compensated MIDI time is still in the future.
const TICK_MS = 25
const LOOKAHEAD_SEC = 0.15
const MAX_LATENCY_COMP_MS = 100
const CLICK_LEN_SEC = 0.03
const TAP_TIMEOUT_MS = 3000
const MAX_TAPS = 4

const LOOP_STATES: LooperState[] = ['recording', 'playing', 'armedOverdub', 'overdubbing', 'armedStop', 'stopped', 'armedPlay']

export function hasRecordedLoop(state: LooperState): boolean {
  return LOOP_STATES.includes(state)
}

type Props = {
  config: LooperConfig
  onConfigChange: (config: LooperConfig) => void
  /** Sends `msg` so it reaches the pedalboard at `perfTime` (performance.now() clock). */
  sendAt: (msg: MidiMessage, perfTime: number) => void
  sendNow: (msg: MidiMessage) => void
}

export type UseLooperReturn = {
  state: LooperState
  isOverflow: boolean
  toggle: () => void
  /** REC while there is no loop, overdub once one is playing. */
  record: () => void
  playStop: () => void
  clear: () => void
  toggleClick: () => void
  tap: () => void
  subscribeBeat: (listener: BeatListener) => () => void
}

export function useLooper({ config, onConfigChange, sendAt, sendNow }: Props): UseLooperReturn {
  const [state, setState] = useState<LooperState>('off')

  // Everything the scheduler reads lives in refs so the audio loop never waits on React.
  const configRef = useRef(config)
  const sendAtRef = useRef(sendAt)
  const sendNowRef = useRef(sendNow)
  const onConfigChangeRef = useRef(onConfigChange)
  useLayoutEffect(() => {
    configRef.current = config
    sendAtRef.current = sendAt
    sendNowRef.current = sendNow
    onConfigChangeRef.current = onConfigChange
  })

  const ctxRef = useRef<AudioContext | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const uiTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const nextBeatTimeRef = useRef(0)
  const nextBeatIndexRef = useRef(0)
  const lastSentPerfRef = useRef(0)
  const machineRef = useRef<Machine>({ state: 'off', anchorBeat: 0, endBeat: 0 })
  const uiEpochRef = useRef(0)
  const listenersRef = useRef<Set<BeatListener>>(new Set())
  const tapTimesRef = useRef<number[]>([])
  const prevSignatureRef = useRef(config.beatsPerBar)

  const isOverflow = loopDurationSec(config) > config.maxRecSeconds

  // ---- helpers ---------------------------------------------------------------

  const audioToPerf = (ctx: AudioContext, t: number): number => {
    const ts = ctx.getOutputTimestamp?.()
    if (ts && ts.performanceTime && ts.contextTime !== undefined) {
      return ts.performanceTime + (t - ts.contextTime) * 1000
    }
    return performance.now() + (t - ctx.currentTime + (ctx.outputLatency || 0)) * 1000
  }

  const atPerf = (perfTime: number, fn: () => void) => {
    const id = setTimeout(() => {
      uiTimeoutsRef.current.delete(id)
      fn()
    }, Math.max(0, perfTime - performance.now()))
    uiTimeoutsRef.current.add(id)
  }

  const sendScheduled = (msg: MidiMessage, perfTime: number) => {
    const comp = Math.min(Math.max(configRef.current.latencyCompMs, 0), MAX_LATENCY_COMP_MS)
    const t = Math.max(performance.now(), perfTime - comp)
    lastSentPerfRef.current = Math.max(lastSentPerfRef.current, t)
    sendAtRef.current(msg, t)
  }

  // Immediate sends must not overtake a command already scheduled in the lookahead window.
  const sendImmediate = (msg: MidiMessage) => {
    const now = performance.now()
    if (lastSentPerfRef.current > now) {
      const t = lastSentPerfRef.current + 1
      lastSentPerfRef.current = t
      sendAtRef.current(msg, t)
    } else {
      sendNowRef.current(msg)
    }
  }

  const setMachine = (next: Partial<Machine>, uiAt?: number) => {
    machineRef.current = { ...machineRef.current, ...next }
    if (next.state === undefined) return
    const s = next.state
    if (uiAt === undefined) {
      // A user action wins over any beat-aligned UI update still waiting to fire.
      uiEpochRef.current++
      setState(s)
    } else {
      const epoch = uiEpochRef.current
      atPerf(uiAt, () => {
        if (uiEpochRef.current === epoch) setState(s)
      })
    }
  }

  const playClick = (ctx: AudioContext, time: number, accent: boolean) => {
    const cfg = configRef.current
    if (!cfg.clickEnabled || cfg.clickVolume <= 0) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = accent ? 1500 : 1000
    gain.gain.setValueAtTime(cfg.clickVolume * (accent ? 1 : 0.6), time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_LEN_SEC)
    osc.connect(gain).connect(ctx.destination)
    osc.start(time)
    osc.stop(time + CLICK_LEN_SEC)
  }

  // Decides, for one beat about to happen, which looper command (if any) fires on it.
  const handleBeat = (beat: number, perfTime: number) => {
    const cfg = configRef.current
    const cmds = cfg.commands
    const loopBeats = cfg.bars * cfg.beatsPerBar
    const m = machineRef.current
    const isDownbeat = beat % cfg.beatsPerBar === 0

    if (m.state === 'armedRec' && isDownbeat) {
      sendScheduled(cmds.recStart, perfTime)
      setMachine({ state: 'recording', anchorBeat: beat, endBeat: beat + loopBeats }, perfTime)
    } else if (m.state === 'recording' && beat === m.endBeat) {
      sendScheduled(cmds.recStop, perfTime)
      setMachine({ state: 'playing' }, perfTime)
    } else if (m.state === 'armedOverdub' && (beat - m.anchorBeat) % loopBeats === 0) {
      sendScheduled(cmds.overdubStart, perfTime)
      setMachine({ state: 'overdubbing', endBeat: beat + loopBeats }, perfTime)
    } else if (m.state === 'overdubbing' && beat === m.endBeat) {
      sendScheduled(cmds.overdubStop, perfTime)
      setMachine({ state: 'playing' }, perfTime)
    } else if (m.state === 'armedStop' && isDownbeat) {
      sendScheduled(cmds.stop, perfTime)
      setMachine({ state: 'stopped' }, perfTime)
    } else if (m.state === 'armedPlay' && isDownbeat) {
      sendScheduled(cmds.play, perfTime)
      setMachine({ state: 'playing', anchorBeat: beat }, perfTime)
    }

    const after = machineRef.current
    const inLoop = after.state !== 'empty' && after.state !== 'armedRec' && after.state !== 'stopped' && after.state !== 'armedPlay'
    const info: BeatInfo = {
      beatInBar: beat % cfg.beatsPerBar,
      beatsPerBar: cfg.beatsPerBar,
      loopBar: inLoop ? Math.floor(((beat - after.anchorBeat) % loopBeats) / cfg.beatsPerBar) + 1 : null,
      bars: cfg.bars,
    }
    atPerf(perfTime, () => listenersRef.current.forEach((l) => l(info)))
  }

  const schedulerTick = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    while (nextBeatTimeRef.current < ctx.currentTime + LOOKAHEAD_SEC) {
      const cfg = configRef.current
      const beat = nextBeatIndexRef.current
      const time = nextBeatTimeRef.current
      playClick(ctx, time, beat % cfg.beatsPerBar === 0)
      handleBeat(beat, audioToPerf(ctx, time))
      nextBeatIndexRef.current = beat + 1
      nextBeatTimeRef.current = time + beatDurationSec(cfg.bpm, cfg.beatUnit)
    }
  }

  const stopClock = () => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    uiTimeoutsRef.current.forEach(clearTimeout)
    uiTimeoutsRef.current.clear()
    ctxRef.current?.suspend()
  }

  // A time-signature change (only allowed without a loop) restarts the bar count on the next beat.
  useEffect(() => {
    if (prevSignatureRef.current === config.beatsPerBar) return
    prevSignatureRef.current = config.beatsPerBar
    nextBeatIndexRef.current = 0
  }, [config.beatsPerBar])

  useEffect(() => {
    const timeouts = uiTimeoutsRef.current
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      timeouts.forEach(clearTimeout)
      ctxRef.current?.close()
    }
  }, [])

  // ---- actions ---------------------------------------------------------------
  /* eslint-disable react-hooks/exhaustive-deps -- actions only touch refs and stable setters */

  const toggle = useCallback(() => {
    if (machineRef.current.state === 'off') {
      // Created/resumed inside the user gesture so the browser allows audio.
      const ctx = ctxRef.current ?? new AudioContext({ latencyHint: 'interactive' })
      ctxRef.current = ctx
      ctx.resume()
      sendImmediate(configRef.current.commands.on)
      nextBeatIndexRef.current = 0
      nextBeatTimeRef.current = ctx.currentTime + 0.1
      lastSentPerfRef.current = 0
      setMachine({ state: 'empty', anchorBeat: 0, endBeat: 0 })
      tickRef.current = setInterval(schedulerTick, TICK_MS)
    } else {
      stopClock()
      sendImmediate(configRef.current.commands.off)
      setMachine({ state: 'off' })
    }
  }, [])

  const record = useCallback(() => {
    const s = machineRef.current.state
    if (s === 'armedRec') setMachine({ state: 'empty' })
    else if (s === 'empty') {
      const cfg = configRef.current
      if (loopDurationSec(cfg) > cfg.maxRecSeconds) return
      setMachine({ state: 'armedRec' })
    } else if (s === 'playing') setMachine({ state: 'armedOverdub' })
    else if (s === 'armedOverdub') setMachine({ state: 'playing' })
  }, [])

  const playStop = useCallback(() => {
    const cmds = configRef.current.commands
    const s = machineRef.current.state
    // First press stops at the end of the current bar; a second press while armed stops right away.
    if (s === 'playing' || s === 'armedOverdub' || s === 'overdubbing') setMachine({ state: 'armedStop' })
    else if (s === 'armedStop') {
      sendImmediate(cmds.stop)
      setMachine({ state: 'stopped' })
    } else if (s === 'stopped') setMachine({ state: 'armedPlay' })
    else if (s === 'armedPlay') setMachine({ state: 'stopped' })
    else if (s === 'armedRec') setMachine({ state: 'empty' })
  }, [])

  const clear = useCallback(() => {
    const s = machineRef.current.state
    if (s === 'off') return
    sendImmediate(configRef.current.commands.clear)
    setMachine({ state: 'empty' })
  }, [])

  const toggleClick = useCallback(() => {
    const cfg = configRef.current
    onConfigChangeRef.current({ ...cfg, clickEnabled: !cfg.clickEnabled })
  }, [])

  const tap = useCallback(() => {
    if (hasRecordedLoop(machineRef.current.state)) return
    const now = performance.now()
    const recent = [...tapTimesRef.current.filter((t) => now - t < TAP_TIMEOUT_MS), now].slice(-MAX_TAPS)
    tapTimesRef.current = recent
    const bpm = computeBpmFromTaps(recent)
    if (bpm !== null) onConfigChangeRef.current({ ...configRef.current, bpm })
  }, [])

  /* eslint-enable react-hooks/exhaustive-deps */

  const subscribeBeat = useCallback((listener: BeatListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  return { state, isOverflow, toggle, record, playStop, clear, toggleClick, tap, subscribeBeat }
}
