'use client'

import type { BankId, ControllerConfig, LooperConfig, TapTempoBindings } from '@/lib/types'
import { BANK_IDS } from '@/lib/types'
import type { UseLooperReturn } from '@/hooks/useLooper'
import type { useTapTempo } from '@/hooks/useTapTempo'
import { presetsInBank } from '@/hooks/useController'
import { describePresetMidi, profileOf } from '@/lib/profiles'
import { PresetPad } from '@/components/PresetPad'
import { FxPad } from '@/components/FxPad'
import { BankBar } from '@/components/perform/BankBar'
import { TapDelayCard } from '@/components/perform/TapDelayCard'
import { LooperMiniCard } from '@/components/perform/LooperMiniCard'
import { SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type Props = {
  config: ControllerConfig
  activeBank: BankId
  onBankChange: (bank: BankId) => void
  activePresetId: string | null
  soloPresetId: string | null
  fxStates: Record<string, boolean>
  onPreset: (id: string) => void
  onFx: (id: string) => void
  tapTempo: ReturnType<typeof useTapTempo>
  onUpdateTapBindings: (b: TapTempoBindings) => void
  tapOtherUsedKeys: Set<string>
  looper: UseLooperReturn
  looperConfig: LooperConfig
  onOpenLooper: () => void
  onOpenEdit: () => void
}

export function PerformView(props: Props) {
  const { config, activeBank, activePresetId, soloPresetId, fxStates } = props
  const profile = profileOf(config)
  const presets = presetsInBank(config, activeBank)
  const counts = Object.fromEntries(BANK_IDS.map((b) => [b, presetsInBank(config, b).length])) as Record<BankId, number>
  const activePreset = config.presets.find((p) => p.id === activePresetId)
  const fxOnCount = config.fxPads.filter((f) => fxStates[f.id]).length
  const showTap = profile.hasTapDelay && config.showTapDelay !== false
  const showLooper = config.showLooper !== false

  const tapCard = (compact: boolean) => (
    <TapDelayCard
      compact={compact}
      isEnabled={props.tapTempo.isEnabled}
      bpm={props.tapTempo.bpm}
      subdivision={props.tapTempo.subdivision}
      delayMs={props.tapTempo.delayMs}
      closestMs={props.tapTempo.closestMs}
      onTap={props.tapTempo.tap}
      onSetSubdivision={props.tapTempo.setSubdivision}
      onDisable={props.tapTempo.disable}
      bindings={config.tapTempoBindings ?? {}}
      onUpdateBindings={props.onUpdateTapBindings}
      otherUsedKeys={props.tapOtherUsedKeys}
    />
  )

  return (
    <div className="flex flex-wrap gap-6 p-4 sm:px-7 sm:py-6">
      <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-6">
        <BankBar activeBank={activeBank} counts={counts} onChange={props.onBankChange} />

        <section aria-label="Presets" className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3 flex-wrap">
            <SectionTitle>Presets</SectionTitle>
            <span className="hidden sm:inline text-[13px] text-ink-dim">Press the active preset again for solo.</span>
          </div>
          {presets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:gap-3.5">
              {presets.map((p, i) => {
                const isSolo = soloPresetId === p.id
                const isActive = activePresetId === p.id && !isSolo
                const live = isSolo || isActive
                return (
                  <PresetPad
                    key={p.id}
                    pad={p}
                    index={i}
                    tag={describePresetMidi(profile, p.midi)}
                    isActive={isActive}
                    isSolo={isSolo}
                    fxDots={config.fxPads.map((f) => (live ? !!fxStates[f.id] : !!p.fxInitialStates[f.id]))}
                    onClick={() => props.onPreset(p.id)}
                  />
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-pad border border-dashed border-line-strong p-5">
              <span className="text-sm text-ink-dim">Bank {activeBank} has no presets yet.</span>
              <Button size="sm" onClick={props.onOpenEdit}>Add presets in Edit</Button>
            </div>
          )}
        </section>

        {config.fxPads.length > 0 && (
          <section aria-label="FX" className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3 flex-wrap">
              <SectionTitle>
                FX <span className="sm:hidden text-ink-dim font-semibold normal-case tracking-normal">· {fxOnCount} on</span>
              </SectionTitle>
              <span className="hidden sm:inline text-[13px] text-ink-dim">
                <span className="font-mono text-fx font-bold">{fxOnCount}</span> on · names follow the active preset
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 sm:gap-3">
              {config.fxPads.map((fx) => (
                <FxPad
                  key={fx.id}
                  pad={fx}
                  isOn={fxStates[fx.id] ?? false}
                  onClick={() => props.onFx(fx.id)}
                  displayName={activePreset?.fxAliases?.[fx.id] || undefined}
                />
              ))}
            </div>
          </section>
        )}

        {showTap && <div className="md:hidden">{tapCard(true)}</div>}
      </div>

      {(showTap || showLooper) && (
        <aside className="hidden md:flex flex-[1_1_340px] max-w-[420px] min-w-0 flex-col gap-5">
          {showTap && tapCard(false)}
          {showLooper && (
            <LooperMiniCard looper={props.looper} config={props.looperConfig} onOpen={props.onOpenLooper} />
          )}
        </aside>
      )}
    </div>
  )
}
