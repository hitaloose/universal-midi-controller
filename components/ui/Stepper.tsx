type Props = {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  format?: (n: number) => string
}

export function Stepper({ value, min, max, onChange, label, disabled, format = String }: Props) {
  const btn =
    'w-11 h-11 rounded-control border border-line bg-surface-2 text-ink text-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className={btn}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="font-mono text-[22px] font-bold min-w-12 text-center tabular-nums">{format(value)}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        className={btn}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  )
}
