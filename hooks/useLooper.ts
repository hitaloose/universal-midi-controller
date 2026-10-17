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
  recStopSent: boolean // REC stop already handed to the MIDI output together with REC start
}

// Scheduler: wakes every TICK_MS and schedules everything that falls inside LOOKAHEAD_MS.
// The lookahead must be larger than latencyCompMs, so the compensated MIDI time is still in the future.
// The clock is performance.now(), not the AudioContext: on Android with a USB pedal the audio
// output is the pedal itself and its timestamps/latency are unreliable, so audio is only used
// for the click and only while the click is on.
const TICK_MS = 25
const LOOKAHEAD_MS = 150
const MAX_LATENCY_COMP_MS = 100
const MAX_LOOP_TRIM_MS = 50
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
  /** Sends `msg` so it reaches the pedalboard at `perfTime` (performance.now() clock). `note` goes to the monitor log. */
  sendAt: (msg: MidiMessage, perfTime: number, note?: string) => void
  sendNow: (msg: MidiMessage) => void
  /**
   * The output honours send timestamps itself (Web MIDI over USB). Then REC stop is scheduled
   * together with REC start, so the loop length never depends on the main thread being on time.
   */
  preciseTimestamps: boolean
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

export function useLooper({ config, onConfigChange, sendAt, sendNow, preciseTimestamps }: Props): UseLooperReturn {
  const [state, setState] = useState<LooperState>('off')

  // Everything the scheduler reads lives in refs so the audio loop never waits on React.
  const configRef = useRef(config)
  const sendAtRef = useRef(sendAt)
  const sendNowRef = useRef(sendNow)
  const onConfigChangeRef = useRef(onConfigChange)
  const preciseRef = useRef(preciseTimestamps)
  useLayoutEffect(() => {
    configRef.current = config
    sendAtRef.current = sendAt
    sendNowRef.current = sendNow
    onConfigChangeRef.current = onConfigChange
    preciseRef.current = preciseTimestamps
  })

  const ctxRef = useRef<AudioContext | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const uiTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const nextBeatTimeRef = useRef(0)
  const nextBeatIndexRef = useRef(0)
  const lastSentPerfRef = useRef(0)
  const machineRef = useRef<Machine>({ state: 'off', anchorBeat: 0, endBeat: 0, recStopSent: false })
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const uiEpochRef = useRef(0)
  const listenersRef = useRef<Set<BeatListener>>(new Set())
  const tapTimesRef = useRef<number[]>([])
  const prevSignatureRef = useRef(config.beatsPerBar)

  const isOverflow = loopDurationSec(config) > config.maxRecSeconds

  // ---- helpers ---------------------------------------------------------------

  // Must run inside a user gesture (toggle / toggleClick) so the browser lets audio start.
  const openAudio = () => {
    if (ctxRef.current) return
    try {
      // 'balanced' instead of 'interactive': low-latency USB audio paths on Android stall the device.
      const ctx = new AudioContext({ latencyHint: 'balanced' })
      ctxRef.current = ctx
      ctx.resume().catch(() => {})
    } catch {
      ctxRef.current = null
    }
  }

  // Closing (not suspending) hands the audio device back to the system.
  const closeAudio = () => {
    const ctx = ctxRef.current
    ctxRef.current = null
    ctx?.close().catch(() => {})
  }

  const atPerf = (perfTime: number, fn: () => void) => {
    const id = setTimeout(() => {
      uiTimeoutsRef.current.delete(id)
      fn()
    }, Math.max(0, perfTime - performance.now()))
    uiTimeoutsRef.current.add(id)
  }

  const sendAtTracked = (msg: MidiMessage, t: number, note?: string) => {
    lastSentPerfRef.current = Math.max(lastSentPerfRef.current, t)
    sendAtRef.current(msg, t, note)
  }

  /** Returns the time the command was actually scheduled for; late sends are flagged in the monitor. */
  const sendScheduled = (msg: MidiMessage, perfTime: number) => {
    const comp = Math.min(Math.max(configRef.current.latencyCompMs, 0), MAX_LATENCY_COMP_MS)
    const now = performance.now()
    const late = now - (perfTime - comp)
    const t = Math.max(now, perfTime - comp)
    sendAtTracked(msg, t, late > 1 ? `late ${Math.round(late)} ms` : undefined)
    return t
  }

  // Scheduled sends can't be cancelled (Chrome has no MIDIOutput.clear()), so an immediate command
  // goes out now and again after anything still pending; looper commands are idempotent.
  const sendImmediate = (msg: MidiMessage) => {
    sendNowRef.current(msg)
    if (lastSentPerfRef.current > performance.now()) sendAtTracked(msg, lastSentPerfRef.current + 1)
  }

  const loopTrimMs = () => Math.min(Math.max(configRef.current.loopTrimMs, -MAX_LOOP_TRIM_MS), MAX_LOOP_TRIM_MS)

  // Keeps the screen on while the looper runs; a dimmed screen gets its timers throttled.
  const requestWakeLock = () => {
    if (wakeLockRef.current || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    navigator.wakeLock.request('screen').then(
      (lock) => {
        if (machineRef.current.state === 'off') lock.release().catch(() => {})
        else wakeLockRef.current = lock
        lock.addEventListener('release', () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null
        })
      },
      () => {},
    )
  }

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
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

  /** Schedules the click so it is heard at `perfTime`. Best effort: audio never drives the clock. */
  const playClick = (perfTime: number, accent: boolean) => {
    const cfg = configRef.current
    const ctx = ctxRef.current
    if (!ctx || ctx.state !== 'running' || !cfg.clickEnabled || cfg.clickVolume <= 0) return
    const ahead = (perfTime - performance.now()) / 1000
    // Beats the tab was too busy to schedule in time are skipped rather than played late in a burst.
    if (ahead < -0.05) return
    const time = Math.max(ctx.currentTime, ctx.currentTime + ahead - (ctx.outputLatency || 0))
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

    // A REC stop from an earlier take may still be queued; recording waits until it has gone out.
    if (m.state === 'armedRec' && isDownbeat && perfTime > lastSentPerfRef.current) {
      const start = sendScheduled(cmds.recStart, perfTime)
      const recStopSent = preciseRef.current
      if (recStopSent) sendAtTracked(cmds.recStop, start + loopDurationSec(cfg) * 1000 + loopTrimMs())
      setMachine({ state: 'recording', anchorBeat: beat, endBeat: beat + loopBeats, recStopSent }, perfTime)
    } else if (m.state === 'recording' && beat === m.endBeat) {
      if (!m.recStopSent) sendScheduled(cmds.recStop, perfTime + loopTrimMs())
      setMachine({ state: 'playing', recStopSent: false }, perfTime)
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
    const horizon = performance.now() + LOOKAHEAD_MS
    while (nextBeatTimeRef.current < horizon) {
      const cfg = configRef.current
      const beat = nextBeatIndexRef.current
      const time = nextBeatTimeRef.current
      playClick(time, beat % cfg.beatsPerBar === 0)
      handleBeat(beat, time)
      nextBeatIndexRef.current = beat + 1
      nextBeatTimeRef.current = time + beatDurationSec(cfg.bpm, cfg.beatUnit) * 1000
    }
  }

  const stopClock = () => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    uiTimeoutsRef.current.forEach(clearTimeout)
    uiTimeoutsRef.current.clear()
    closeAudio()
    releaseWakeLock()
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
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  // The browser drops the wake lock whenever the page is hidden.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && machineRef.current.state !== 'off') requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ---- actions ---------------------------------------------------------------
  /* eslint-disable react-hooks/exhaustive-deps -- actions only touch refs and stable setters */

  const toggle = useCallback(() => {
    if (machineRef.current.state === 'off') {
      // Audio only when the click is on; opened here, inside the user gesture.
      if (configRef.current.clickEnabled) openAudio()
      // lastSentPerfRef is kept: a REC stop queued before the last power-off may still be pending.
      sendImmediate(configRef.current.commands.on)
      nextBeatIndexRef.current = 0
      nextBeatTimeRef.current = performance.now() + 100
      setMachine({ state: 'empty', anchorBeat: 0, endBeat: 0, recStopSent: false })
      requestWakeLock()
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
    const clickEnabled = !cfg.clickEnabled
    if (!clickEnabled) closeAudio()
    else if (machineRef.current.state !== 'off') openAudio()
    onConfigChangeRef.current({ ...cfg, clickEnabled })
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
