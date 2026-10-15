import { formatKeyCode } from '@/components/KeyBindingField'

type Tone = 'idle' | 'onAmber' | 'onMint' | 'onViolet'

const TONES: Record<Tone, string> = {
  idle: 'border-line text-ink-dim',
  onAmber: 'border-black/30 text-preset-ink/70',
  onMint: 'border-fx/40 text-[#8EE9BF]',
  onViolet: 'border-black/30 text-solo-ink/70',
}

export function KeyCap({ code, tone = 'idle', className = '' }: { code?: string; tone?: Tone; className?: string }) {
  if (!code) return null
  return (
    <span
      className={`font-mono text-xs font-bold min-w-[22px] text-center px-1.5 py-[3px] rounded-md border ${TONES[tone]} ${className}`}
      aria-label={`Key ${formatKeyCode(code)}`}
    >
      {formatKeyCode(code)}
    </span>
  )
}
