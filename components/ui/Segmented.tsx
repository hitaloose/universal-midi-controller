type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function Segmented<T extends string>({ label, options, value, onChange, size = 'md', className = '' }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={`flex bg-ground border border-line-soft rounded-xl p-[3px] ${className}`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-[9px] px-3 cursor-pointer transition-colors ${size === 'sm' ? 'min-h-9 text-xs' : 'min-h-10 text-[13px]'} ${
              on ? 'bg-line-soft text-preset font-bold' : 'text-ink-dim font-semibold hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
