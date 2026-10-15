import type { ControllerConfig } from './types'

/** Fills in fields added after a config was saved, so old configs and imports keep working. */
export function normalizeConfig(config: ControllerConfig): ControllerConfig {
  return {
    ...config,
    presets: config.presets.map((p) => ({ ...p, bank: p.bank ?? 'A' })),
  }
}

const STORAGE_KEY = 'umc-config'
const MIDI_OUTPUT_KEY = 'umc-last-midi-output'
const BT_DEVICE_KEY = 'umc-last-bt-device'

export function loadConfig(): ControllerConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeConfig(JSON.parse(raw) as ControllerConfig) : null
  } catch {
    return null
  }
}

export function saveConfig(config: ControllerConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function loadLastMidiOutputId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(MIDI_OUTPUT_KEY)
}

export function saveLastMidiOutputId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MIDI_OUTPUT_KEY, id)
}

export function loadLastBtDeviceName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(BT_DEVICE_KEY)
}

export function saveLastBtDeviceName(name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BT_DEVICE_KEY, name)
}

export function downloadFile(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadConfig(config: ControllerConfig): void {
  downloadFile('midi-config.json', JSON.stringify(config, null, 2), 'application/json')
}

export function readConfigFromFile(file: File): Promise<ControllerConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (!Array.isArray(parsed.presets) || !Array.isArray(parsed.fxPads)) {
          reject(new Error('Invalid file: incorrect structure'))
          return
        }
        resolve(normalizeConfig(parsed as ControllerConfig))
      } catch {
        reject(new Error('Invalid file: malformed JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
