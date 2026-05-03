'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ControllerConfig, FxPad, PresetPad } from '@/lib/types'
import { loadConfig, saveConfig } from '@/lib/storage'

type UseControllerReturn = {
  config: ControllerConfig
  activePresetId: string | null
  fxStates: Record<string, boolean>
  activatePreset: (id: string) => void
  toggleFx: (id: string) => void
  updateConfig: (config: ControllerConfig) => void
}

function buildDefaultFxStates(fxPads: FxPad[]): Record<string, boolean> {
  return Object.fromEntries(fxPads.map((fx) => [fx.id, false]))
}

export function useController(): UseControllerReturn {
  const [config, setConfig] = useState<ControllerConfig>({ presets: [], fxPads: [] })
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
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

  const toggleFx = useCallback((id: string) => {
    setFxStates((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const updateConfig = useCallback((newConfig: ControllerConfig) => {
    setConfig(newConfig)
    saveConfig(newConfig)
    setFxStates(buildDefaultFxStates(newConfig.fxPads))
    setActivePresetId(null)
  }, [])

  return { config, activePresetId, fxStates, activatePreset, toggleFx, updateConfig }
}
