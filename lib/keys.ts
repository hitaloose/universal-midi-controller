import type { BankId, ControllerConfig } from './types'

const present = (keys: (string | undefined)[]) => keys.filter((k): k is string => !!k)

export function globalKeys(config: ControllerConfig): string[] {
  return [...present(Object.values(config.tapTempoBindings ?? {})), ...present(Object.values(config.looper?.bindings ?? {}))]
}

/**
 * Keys another control already owns. Preset keys only clash inside their own bank
 * (only the active bank listens), everything else is global.
 */
export function usedKeysFor(
  config: ControllerConfig,
  target: { kind: 'preset'; id: string; bank: BankId } | { kind: 'fx'; id: string },
): Set<string> {
  const presets =
    target.kind === 'preset'
      ? config.presets.filter((p) => p.id !== target.id && (p.bank ?? 'A') === target.bank)
      : config.presets
  const fx = config.fxPads.filter((f) => !(target.kind === 'fx' && f.id === target.id))
  return new Set([
    ...present(presets.map((p) => p.keyBinding)),
    ...present(fx.map((f) => f.keyBinding)),
    ...globalKeys(config),
  ])
}

/** Every pad key (all banks); used by the tap and looper key pickers. */
export function padKeys(config: ControllerConfig): string[] {
  return [...present(config.presets.map((p) => p.keyBinding)), ...present(config.fxPads.map((f) => f.keyBinding))]
}
