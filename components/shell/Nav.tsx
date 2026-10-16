'use client'

import type { ComponentType } from 'react'
import type { AppView } from '@/hooks/useAppView'
import { EditIcon, LooperIcon, MonitorIcon, PerformIcon, SettingsIcon } from '@/components/ui/icons'

type Item = { view: AppView; label: string; Icon: ComponentType<{ size?: number }> }

const ITEMS: Item[] = [
  { view: 'perform', label: 'Perform', Icon: PerformIcon },
  { view: 'edit', label: 'Edit', Icon: EditIcon },
  { view: 'looper', label: 'Looper', Icon: LooperIcon },
  { view: 'monitor', label: 'Monitor', Icon: MonitorIcon },
  { view: 'settings', label: 'Settings', Icon: SettingsIcon },
]

type Props = { view: AppView; onChange: (view: AppView) => void; hideLooper?: boolean }

function visible(items: Item[], hideLooper?: boolean) {
  return hideLooper ? items.filter((i) => i.view !== 'looper') : items
}

export function NavRail({ view, onChange, hideLooper }: Props) {
  const items = visible(ITEMS, hideLooper)
  const main = items.filter((i) => i.view !== 'settings')
  const settings = items.find((i) => i.view === 'settings')!
  const link = (item: Item) => {
    const on = item.view === view
    return (
      <a
        key={item.view}
        href={item.view === 'perform' ? '#' : `#${item.view}`}
        onClick={(e) => {
          e.preventDefault()
          onChange(item.view)
        }}
        aria-current={on ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 w-[60px] py-[9px] rounded-xl no-underline text-[11px] ${
          on ? 'bg-line-soft text-preset font-semibold' : 'text-ink-dim font-medium hover:text-ink'
        }`}
      >
        <item.Icon />
        {item.label}
      </a>
    )
  }
  return (
    <nav
      aria-label="Main"
      className="hidden md:flex box-border shrink-0 overflow-y-auto w-[76px] flex-col items-center gap-1.5 py-4 border-r border-line-soft bg-bar"
    >
      {main.map(link)}
      <div className="flex-1" />
      {link(settings)}
    </nav>
  )
}

export function BottomTabs({ view, onChange, hideLooper }: Props) {
  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 flex border-t border-line-soft bg-bar pb-[env(safe-area-inset-bottom)]"
    >
      {visible(ITEMS, hideLooper).map((item) => {
        const on = item.view === view
        return (
          <a
            key={item.view}
            href={item.view === 'perform' ? '#' : `#${item.view}`}
            onClick={(e) => {
              e.preventDefault()
              onChange(item.view)
            }}
            aria-current={on ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-[3px] min-h-14 no-underline text-[11px] ${
              on ? 'text-preset font-bold' : 'text-ink-dim font-medium'
            }`}
          >
            <item.Icon size={22} />
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
