'use client'

type Props = {
  label: string
  children: React.ReactNode
  columns?: number
}

export function PadGrid({ label, children, columns = 4 }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</h2>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </section>
  )
}
