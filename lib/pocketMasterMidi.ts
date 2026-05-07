export type PocketMasterFxOption = { cc: number; label: string }

export const POCKET_MASTER_FX_OPTIONS: PocketMasterFxOption[] = [
  { cc: 43, label: 'NR (Noise Reduction)' },
  { cc: 44, label: 'FX1' },
  { cc: 45, label: 'DRV (Drive)' },
  { cc: 46, label: 'AMP' },
  { cc: 47, label: 'IR (Impulse Response)' },
  { cc: 48, label: 'EQ' },
  { cc: 49, label: 'FX2' },
  { cc: 50, label: 'DLY (Delay)' },
  { cc: 51, label: 'RVB (Reverb)' },
  { cc: 58, label: 'Tuner' },
  { cc: 59, label: 'Looper' },
  { cc: 92, label: 'Drum' },
]

export const POCKET_MASTER_PRESET_CC = 1
