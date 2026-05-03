'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ControllerConfig, FxPad, PresetPad } from '@/lib/types'
import { loadConfig, saveConfig } from '@/lib/storage'

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
  }
}
