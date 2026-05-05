'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ControllerConfig, FxPad, PresetPad } from '@/lib/types'
import { loadConfig, saveConfig } from '@/lib/storage'
import { makeId } from '@/lib/utils'

type UseControllerReturn = {
  config: ControllerConfig
  activePresetId: string | null
  soloPresetId: string | null
  fxStates: Record<string, boolean>
  activatePreset: (id: string) => void
  toggleFx: (id: string) => void
  updateConfig: (config: ControllerConfig) => void
  enterSoloMode: (id: string) => string[]
  exitSoloMode: () => { toActivate: string[]; toDeactivate: string[] }
  addPreset: () => void
  removePreset: (id: string) => void
  addFxPad: () => void
  removeFxPad: (id: string) => void
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
    },
    [config],
  )

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
  }, [])

  const addPreset = useCallback(() => {
    setConfig((prev) => {
      const n = prev.presets.length + 1
      const newPreset: PresetPad = {
        id: makeId(),
        name: `Preset ${n}`,
        midi: { channel: 1, type: 'programChange', data1: n - 1, data2: 0 },
        fxInitialStates: Object.fromEntries(prev.fxPads.map((fx) => [fx.id, false])),
        fxSoloStates: Object.fromEntries(prev.fxPads.map((fx) => [fx.id, false])),
      }
      const next = { ...prev, presets: [...prev.presets, newPreset] }
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
      const n = prev.fxPads.length + 1
      const newFx: FxPad = {
        id: newId,
        name: `FX ${n}`,
        midiOn: { channel: 1, type: 'controlChange', data1: n - 1, data2: 127 },
        midiOff: { channel: 1, type: 'controlChange', data1: n - 1, data2: 0 },
      }
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
    fxStates,
    activatePreset,
    toggleFx,
    updateConfig,
    enterSoloMode,
    exitSoloMode,
    addPreset,
    removePreset,
    addFxPad,
    removeFxPad,
  }
}
