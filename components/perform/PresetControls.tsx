'use client'

import { useState } from 'react'
import type { PresetControlBindings, PresetPad, SceneId, StompSwitchId } from '@/lib/types'
import { KeyBindingField } from '@/components/KeyBindingField'
import { SectionTitle } from '@/components/ui/Card'
import { KeyCap } from '@/components/ui/KeyCap'
import { GearIcon } from '@/components/ui/icons'

export const PRESET_CONTROL_LABELS: Record<SceneId | StompSwitchId, string> = {
  base: 'BASE',
  sc1: 'SC1',
  sc2: 'SC2',
  fs1: 'FS1',
  fs2: 'FS2',
}

const SCENE_IDS: SceneId[] = ['base', 'sc1', 'sc2']
const STOMP_IDS: StompSwitchId[] = ['fs1', 'fs2']

type Props = {
  preset: PresetPad
  /** Scene buttons are shown only when the preset has scenes. */
  showScenes: boolean
  activeScene: SceneId
  onScene: (scene: SceneId) => void
  stompStates: Partial<Record<StompSwitchId, boolean>>
  onStomp: (id: StompSwitchId) => void
  bindings: PresetControlBindings
  onUpdateBindings: (b: PresetControlBindings) => void
  otherUsedKeys: Set<string>
}

/** Scene and STOMP buttons of the active preset (Pocket Master CFW). */
export function PresetControls(props: Props) {
  const { preset, showScenes, activeScene, stompStates, bindings } = props
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const stompIds = STOMP_IDS.filter((id) => preset.stomp?.[id])
  const sceneName = (id: SceneId) => (id === 'base' ? 'Base' : preset.scenes?.[id].name || PRESET_CONTROL_LABELS[id])
  const shownIds: (SceneId | StompSwitchId)[] = [...(showScenes ? SCENE_IDS : []), ...stompIds]

  const keyUsed = (except: SceneId | StompSwitchId) =>
    new Set([
      ...props.otherUsedKeys,
      ...(Object.entries(bindings) as [SceneId | StompSwitchId, string | undefined][])
        .filter(([k, v]) => k !== except && v)
        .map(([, v]) => v!),
    ])

  return (
    <section aria-label="Scenes and STOMP" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SectionTitle>{showScenes && stompIds.length > 0 ? 'Scenes · STOMP' : showScenes ? 'Scenes' : 'STOMP'}</SectionTitle>
        <div className="flex-1" />
        <button
          type="button"
          aria-label="Scene and STOMP keys"
          aria-expanded={isConfigOpen}
          onClick={() => setIsConfigOpen((v) => !v)}
          className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer ${isConfigOpen ? 'text-preset bg-line-soft' : 'text-ink-dim hover:text-ink'}`}
        >
          <GearIcon size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5 sm:gap-3">
        {showScenes && (
          <div role="group" aria-label="Scene" className="flex-[3_1_300px] grid grid-cols-3 gap-2.5 sm:gap-3">
            {SCENE_IDS.map((id) => {
              const on = activeScene === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => props.onScene(id)}
                  className={`flex flex-col justify-between items-start text-left min-h-[64px] sm:min-h-[76px] px-3.5 py-2.5 rounded-[14px] border cursor-pointer select-none transition-colors ${
                    on ? 'bg-preset border-preset-hi text-preset-ink' : 'bg-surface border-line-soft text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className={`font-mono text-xs font-bold tracking-[0.1em] ${on ? '' : 'text-ink-mute'}`}>{PRESET_CONTROL_LABELS[id]}</span>
                    <KeyCap code={bindings[id]} tone={on ? 'onAmber' : 'idle'} />
                  </span>
                  <span className="text-base font-bold leading-tight break-words">{sceneName(id)}</span>
                </button>
              )
            })}
          </div>
        )}
        {stompIds.length > 0 && (
          <div role="group" aria-label="STOMP" className={`flex-[2_1_200px] grid gap-2.5 sm:gap-3 ${stompIds.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {stompIds.map((id) => {
              const on = !!stompStates[id]
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => props.onStomp(id)}
                  className={`flex flex-col justify-between items-start text-left min-h-[64px] sm:min-h-[76px] px-3.5 py-2.5 rounded-[14px] border cursor-pointer select-none transition-colors ${
                    on ? 'bg-fx-deep border-fx-line text-fx-ink' : 'bg-surface border-line-soft text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className={`font-mono text-xs font-bold tracking-[0.1em] ${on ? 'text-fx' : 'text-ink-mute'}`}>
                      {PRESET_CONTROL_LABELS[id]} · {on ? 'ON' : 'OFF'}
                    </span>
                    <KeyCap code={bindings[id]} tone={on ? 'onMint' : 'idle'} />
                  </span>
                  <span className="text-base font-bold leading-tight break-words">{preset.stomp?.[id]?.name || PRESET_CONTROL_LABELS[id]}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isConfigOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-card border border-line-soft bg-surface p-3.5">
          {shownIds.map((id) => (
            <KeyBindingField
              key={id}
              label={`${PRESET_CONTROL_LABELS[id]} key`}
              value={bindings[id]}
              usedKeys={keyUsed(id)}
              onChange={(code) => props.onUpdateBindings({ ...bindings, [id]: code })}
            />
          ))}
        </div>
      )}
    </section>
  )
}
