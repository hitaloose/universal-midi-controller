import type { ControllerConfig } from './types'

const STORAGE_KEY = 'umc-config'

export function loadConfig(): ControllerConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ControllerConfig) : null
  } catch {
    return null
  }
}

export function saveConfig(config: ControllerConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
