'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BankId, ControllerConfig, FxPad, PresetPad, SceneId, StompSwitchId } from '@/lib/types'
import { loadConfig, saveConfig } from '@/lib/storage'
import { makeFxPad, makePreset, profileOf } from '@/lib/profiles'
import { makeId } from '@/lib/utils'

type UseControllerReturn = {
  config: ControllerConfig
  activePresetId: string | null
  soloPresetId: string | null
  activeBank: BankId
  setActiveBank: (bank: BankId) => void
  fxStates: Record<string, boolean>
  activatePreset: (id: string) => void
  /** Scene playing on the pedal for the active preset (always BASE after a preset change). */
  activeScene: SceneId
  /** Shows a scene's FX states; leaves solo, since the scene sets the blocks. */
  selectScene: (scene: SceneId) => void
  stompStates: Partial<Record<StompSwitchId, boolean>>
  toggleStomp: (id: StompSwitchId) => void
  toggleFx: (id: string) => void
  updateConfig: (config: ControllerConfig) => void
  patchConfig: (partial: Partial<ControllerConfig>) => void
  enterSoloMode: (id: string) => string[]
  exitSoloMode: () => { toActivate: string[]; toDeactivate: string[] }
  /** Returns the new preset's id. */
  addPreset: (bank: BankId) => string
  duplicatePreset: (id: string) => string | null
  removePreset: (id: string) => void
  movePreset: (id: string, dir: -1 | 1) => void
  /** Returns the new FX pad's id. */
  addFxPad: () => string
  removeFxPad: (id: string) => void
  moveFxPad: (id: string, dir: -1 | 1) => void
}

export function bankOf(preset: PresetPad): BankId {
  return preset.bank ?? 'A'
}

export function presetsInBank(config: ControllerConfig, bank: BankId): PresetPad[] {
  return config.presets.filter((p) => bankOf(p) === bank)
}

function swapAt<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

type SceneFx = Record<SceneId, Record<string, boolean>>

/** FX states of every scene of a preset; a pad a scene does not list follows BASE. */
function buildSceneFx(preset: PresetPad, fxPads: FxPad[]): SceneFx {
  const base = Object.fromEntries(fxPads.map((fx) => [fx.id, preset.fxInitialStates[fx.id] ?? false]))
  const scene = (id: 'sc1' | 'sc2') =>
    Object.fromEntries(fxPads.map((fx) => [fx.id, preset.scenes?.[id].fxStates[fx.id] ?? base[fx.id]]))
  return { base, sc1: scene('sc1'), sc2: scene('sc2') }
}

function buildDefaultFxStates(fxPads: FxPad[]): Record<string, boolean> {
  return Object.fromEntries(fxPads.map((fx) => [fx.id, false]))
}

export function useController(): UseControllerReturn {
  const [config, setConfig] = useState<ControllerConfig>({ presets: [], fxPads: [] })
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [soloPresetId, setSoloPresetId] = useState<string | null>(null)
  const [fxSnapshot, setFxSnapshot] = useState<Record<string, boolean> | null>(null)
  const [fxStates, setFxStates] = useState<Record<string, boolean>>({})
  const [activeBank, setActiveBank] = useState<BankId>('A')
  const [activeScene, setActiveScene] = useState<SceneId>('base')
  // Live FX states per scene, like the pedal: a block switched inside a scene stays that way in it.
  const [sceneFx, setSceneFx] = useState<SceneFx | null>(null)
  const [stompStates, setStompStates] = useState<Partial<Record<StompSwitchId, boolean>>>({})

  useEffect(() => {
    const saved = loadConfig()
    if (saved) {
      setConfig(saved)
      setFxStates(buildDefaultFxStates(saved.fxPads))
    }
  }, [])

  const activatePreset = useCallback(
    (id: string) => {
      const preset = config.presets.find((p: PresetPad) => p.id === id)
      if (!preset) return
      setActivePresetId(id)
      setSoloPresetId(null)
      setFxSnapshot(null)
      setFxStates((prev) => {
        const next = { ...prev }
        for (const fx of config.fxPads) {
          next[fx.id] = preset.fxInitialStates[fx.id] ?? false
        }
        return next
      })
      // The pedal starts every preset on BASE with its saved STOMP group states.
      setActiveScene('base')
      setSceneFx(buildSceneFx(preset, config.fxPads))
      setStompStates({ fs1: preset.stomp?.fs1?.initialOn ?? false, fs2: preset.stomp?.fs2?.initialOn ?? false })
    },
    [config],
  )

  const selectScene = useCallback(
    (scene: SceneId) => {
      if (!sceneFx || scene === activeScene) return
      setSceneFx({ ...sceneFx, [activeScene]: fxStates })
      setFxStates((prev) => ({ ...prev, ...sceneFx[scene] }))
      setActiveScene(scene)
      setSoloPresetId(null)
      setFxSnapshot(null)
    },
    [sceneFx, activeScene, fxStates],
  )

  const toggleStomp = useCallback((id: StompSwitchId) => {
    setStompStates((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const enterSoloMode = useCallback(
    (id: string): string[] => {
      const preset = config.presets.find((p: PresetPad) => p.id === id)
      if (!preset) return []

      const toActivate: string[] = []
      for (const fx of config.fxPads) {
        const shouldActivate = preset.fxSoloStates?.[fx.id] ?? false
        if (shouldActivate && !fxStates[fx.id]) {
          toActivate.push(fx.id)
        }
      }

      setFxSnapshot({ ...fxStates })
      setSoloPresetId(id)
      setFxStates((prev) => {
        const next = { ...prev }
        for (const fx of config.fxPads) {
          if (preset.fxSoloStates?.[fx.id]) next[fx.id] = true
        }
        return next
      })

      return toActivate
    },
    [config, fxStates],
  )

  const exitSoloMode = useCallback((): { toActivate: string[]; toDeactivate: string[] } => {
    if (!fxSnapshot) return { toActivate: [], toDeactivate: [] }

    const toActivate: string[] = []
    const toDeactivate: string[] = []

    for (const fx of config.fxPads) {
      const wasOn = fxSnapshot[fx.id] ?? false
      const isOn = fxStates[fx.id] ?? false
      if (wasOn && !isOn) toActivate.push(fx.id)
      if (!wasOn && isOn) toDeactivate.push(fx.id)
    }

    setFxStates({ ...fxSnapshot })
    setFxSnapshot(null)
    setSoloPresetId(null)

    return { toActivate, toDeactivate }
  }, [config, fxStates, fxSnapshot])

  const toggleFx = useCallback((id: string) => {
    setFxStates((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const updateConfig = useCallback((newConfig: ControllerConfig) => {
    setConfig(newConfig)
    saveConfig(newConfig)
    setFxStates(buildDefaultFxStates(newConfig.fxPads))
    setActivePresetId(null)
    setSoloPresetId(null)
    setFxSnapshot(null)
    setActiveScene('base')
    setSceneFx(null)
    setStompStates({})
  }, [])

  // Saves settings that don't affect pads (e.g. looper) without resetting preset/FX state.
  const patchConfig = useCallback((partial: Partial<ControllerConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial }
      saveConfig(next)
      return next
    })
  }, [])

  const addPreset = useCallback((bank: BankId) => {
    const id = makeId()
    setConfig((prev) => {
      const profile = profileOf(prev)
      const index = presetsInBank(prev, bank).length
      const newPreset: PresetPad = {
        ...makePreset(profile, index, bank, prev.fxPads, prev.defaultChannel ?? 1),
        id,
      }
      const next = { ...prev, presets: [...prev.presets, newPreset] }
      saveConfig(next)
      return next
    })
    return id
  }, [])

  const duplicatePreset = useCallback(
    (id: string) => {
      const source = config.presets.find((p) => p.id === id)
      if (!source) return null
      const copyId = makeId()
      setConfig((prev) => {
        const i = prev.presets.findIndex((p) => p.id === id)
        if (i < 0) return prev
        const copy: PresetPad = { ...prev.presets[i], id: copyId, name: `${prev.presets[i].name} copy`, keyBinding: undefined }
        const presets = [...prev.presets.slice(0, i + 1), copy, ...prev.presets.slice(i + 1)]
        const next = { ...prev, presets }
        saveConfig(next)
        return next
      })
      return copyId
    },
    [config],
  )

  // Presets only swap with their neighbours inside the same bank.
  const movePreset = useCallback((id: string, dir: -1 | 1) => {
    setConfig((prev) => {
      const i = prev.presets.findIndex((p) => p.id === id)
      if (i < 0) return prev
      const bank = bankOf(prev.presets[i])
      let j = i + dir
      while (j >= 0 && j < prev.presets.length && bankOf(prev.presets[j]) !== bank) j += dir
      if (j < 0 || j >= prev.presets.length) return prev
      const next = { ...prev, presets: swapAt(prev.presets, i, j) }
      saveConfig(next)
      return next
    })
  }, [])

  const moveFxPad = useCallback((id: string, dir: -1 | 1) => {
    setConfig((prev) => {
      const i = prev.fxPads.findIndex((f) => f.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.fxPads.length) return prev
      const next = { ...prev, fxPads: swapAt(prev.fxPads, i, j) }
      saveConfig(next)
      return next
    })
  }, [])

  const removePreset = useCallback((id: string) => {
    setConfig((prev) => {
      const next = { ...prev, presets: prev.presets.filter((p) => p.id !== id) }
      saveConfig(next)
      return next
    })
    setActivePresetId((prev) => (prev === id ? null : prev))
    setSoloPresetId((prev) => {
      if (prev === id) {
        setFxSnapshot(null)
        return null
      }
      return prev
    })
  }, [])

  const addFxPad = useCallback(() => {
    const newId = makeId()
    setConfig((prev) => {
      const profile = profileOf(prev)
      const newFx: FxPad = { ...makeFxPad(profile, prev.fxPads.length, prev.defaultChannel ?? 1), id: newId }
      const updatedPresets = prev.presets.map((p) => ({
        ...p,
        fxInitialStates: { ...p.fxInitialStates, [newId]: false },
        fxSoloStates: { ...p.fxSoloStates, [newId]: false },
      }))
      const next = { ...prev, fxPads: [...prev.fxPads, newFx], presets: updatedPresets }
      saveConfig(next)
      return next
    })
    setFxStates((prev) => ({ ...prev, [newId]: false }))
    return newId
  }, [])

  const removeFxPad = useCallback((id: string) => {
    setConfig((prev) => {
      const updatedPresets = prev.presets.map((p) => {
        const { [id]: _i, ...fxInitialStates } = p.fxInitialStates
        const { [id]: _s, ...fxSoloStates } = p.fxSoloStates
        return { ...p, fxInitialStates, fxSoloStates }
      })
      const next = {
        ...prev,
        fxPads: prev.fxPads.filter((fx) => fx.id !== id),
        presets: updatedPresets,
      }
      saveConfig(next)
      return next
    })
    setFxStates((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }, [])

  return {
    config,
    activePresetId,
    soloPresetId,
    activeBank,
    setActiveBank,
    fxStates,
    activatePreset,
    activeScene,
    selectScene,
    stompStates,
    toggleStomp,
    toggleFx,
    updateConfig,
    patchConfig,
    enterSoloMode,
    exitSoloMode,
    addPreset,
    duplicatePreset,
    removePreset,
    movePreset,
    addFxPad,
    removeFxPad,
    moveFxPad,
  }
}
