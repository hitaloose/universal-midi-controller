import type { PadColor } from './types'

export const PAD_COLORS: { id: PadColor; label: string; hex: string; hi: string; ink: string }[] = [
  { id: 'amber', label: 'Amber', hex: '#FFB224', hi: '#FFC95C', ink: '#1A1200' },
  { id: 'mint', label: 'Mint', hex: '#3DDC97', hi: '#8EE9BF', ink: '#04241A' },
  { id: 'blue', label: 'Blue', hex: '#5AA9FF', hi: '#9CCBFF', ink: '#06121F' },
  { id: 'violet', label: 'Violet', hex: '#B79CFF', hi: '#D2BFFF', ink: '#140A33' },
  { id: 'coral', label: 'Coral', hex: '#FF7A59', hi: '#FFA88F', ink: '#2A0B03' },
]

export function padColor(id: PadColor | undefined) {
  return PAD_COLORS.find((c) => c.id === id) ?? PAD_COLORS[0]
}
