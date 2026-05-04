import { useEffect } from 'react'
import type { ControllerConfig } from '@/lib/types'

type Props = {
  config: ControllerConfig
  onPresetPad: (id: string) => void
  onFxPad: (id: string) => void
  onTap: () => void
  onCycleSubdivision: () => void
  onDisable: () => void
  enabled: boolean
}

export function useKeyboardBindings({
  config,
  onPresetPad,
  onFxPad,
  onTap,
  onCycleSubdivision,
  onDisable,
  enabled,
}: Props) {
  useEffect(() => {
    if (!enabled) return

    const presetMap = new Map(
      config.presets
        .filter((p) => p.keyBinding)
        .map((p) => [p.keyBinding!, p.id])
    )
    const fxMap = new Map(
      config.fxPads
        .filter((f) => f.keyBinding)
        .map((f) => [f.keyBinding!, f.id])
    )
    const tap = config.tapTempoBindings

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

      const { code } = e

      if (presetMap.has(code)) {
        e.preventDefault()
        onPresetPad(presetMap.get(code)!)
      } else if (fxMap.has(code)) {
        e.preventDefault()
        onFxPad(fxMap.get(code)!)
      } else if (tap?.tap === code) {
        e.preventDefault()
        onTap()
      } else if (tap?.cycleSubdivision === code) {
        e.preventDefault()
        onCycleSubdivision()
      } else if (tap?.disable === code) {
        e.preventDefault()
        onDisable()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [config, enabled, onPresetPad, onFxPad, onTap, onCycleSubdivision, onDisable])
}
