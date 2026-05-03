'use client'

import type { PresetPad as PresetPadType } from '@/lib/types'

type Props = {
  pad: PresetPadType
  isActive: boolean
  onClick: () => void
  onConfigure: () => void
}

export function PresetPad({ pad, isActive, onClick, onConfigure }: Props) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-2
          border-2 transition-all duration-150 select-none
          ${isActive
            ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/50'
            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700'
          }
        `}
      >
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-white' : 'bg-zinc-600'}`} />
        <span className={`text-sm font-medium text-center px-2 leading-tight ${isActive ? 'text-white' : 'text-zinc-400'}`}>
          {pad.name}
        </span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onConfigure() }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
          w-6 h-6 rounded flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white"
        title="Configurar"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
        </svg>
      </button>
    </div>
  )
}
