export function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function computeBpmFromTaps(times: number[]): number | null {
  if (times.length < 2) return null
  const avgInterval = (times[times.length - 1] - times[0]) / (times.length - 1)
  return Math.max(20, Math.min(300, Math.round(60000 / avgInterval)))
}
