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

export function downloadConfig(config: ControllerConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'midi-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function readConfigFromFile(file: File): Promise<ControllerConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (!Array.isArray(parsed.presets) || !Array.isArray(parsed.fxPads)) {
          reject(new Error('Arquivo inválido: estrutura incorreta'))
          return
        }
        resolve(parsed as ControllerConfig)
      } catch {
        reject(new Error('Arquivo inválido: JSON malformado'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
    reader.readAsText(file)
  })
}
