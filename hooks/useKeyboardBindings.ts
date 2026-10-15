import { useEffect } from 'react'
import type { BankId, ControllerConfig, LooperBindings } from '@/lib/types'
import { presetsInBank } from '@/hooks/useController'

type Props = {
  config: ControllerConfig
  /** Preset keys only fire for the presets of this bank, so each bank can reuse 1–8. */
  activeBank: BankId
  onPresetPad: (id: string) => void
  onFxPad: (id: string) => void
  onTap: () => void
  onCycleSubdivision: () => void
  onDisable: () => void
  looperBindings: LooperBindings
  looperActions: Record<keyof LooperBindings, () => void>
  enabled: boolean
}

export function useKeyboardBindings({
  config,
  activeBank,
  onPresetPad,
  onFxPad,
  onTap,
  onCycleSubdivision,
  onDisable,
  looperBindings,
  looperActions,
  enabled,
}: Props) {
  useEffect(() => {
    if (!enabled) return

    const presetMap = new Map(
      presetsInBank(config, activeBank)
        .filter((p) => p.keyBinding)
        .map((p) => [p.keyBinding!, p.id])
    )
    const fxMap = new Map(
      config.fxPads
        .filter((f) => f.keyBinding)
        .map((f) => [f.keyBinding!, f.id])
    )
    const tap = config.tapTempoBindings
    const looperMap = new Map(
      (Object.entries(looperBindings) as [keyof LooperBindings, string | undefined][])
        .filter(([, code]) => code)
        .map(([action, code]) => [code!, action])
    )

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      // A dialog (e.g. looper settings) owns the keyboard while open.
      if (document.querySelector('[aria-modal="true"]')) return

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
      } else if (looperMap.has(code)) {
        e.preventDefault()
        // Holding a key must not re-trigger REC/overdub arming.
        if (!e.repeat) looperActions[looperMap.get(code)!]?.()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [config, activeBank, enabled, onPresetPad, onFxPad, onTap, onCycleSubdivision, onDisable, looperBindings, looperActions])
}
