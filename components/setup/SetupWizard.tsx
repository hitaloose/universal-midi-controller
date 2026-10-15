'use client'

import { useState } from 'react'
import type { ControllerConfig, PedalboardType } from '@/lib/types'
import type { UseOutputReturn } from '@/hooks/useOutput'
import { PROFILES, PROFILE_ORDER, TEMPLATES, buildInitialConfig, makeFxPad } from '@/lib/profiles'
import { describeMidi } from '@/lib/profiles'
import { DeviceList } from '@/components/DeviceList'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Stepper } from '@/components/ui/Stepper'
import { FieldLabel } from '@/components/ui/Card'
import { Logo } from '@/components/ui/icons'

type Step = 1 | 2 | 3

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Pedalboard' },
  { n: 2, label: 'Connect' },
  { n: 3, label: 'Layout' },
]

function Steps({ step }: { step: Step }) {
  return (
    <ol className="list-none m-0 p-0 flex items-center gap-3 text-[13px] font-semibold">
      {STEPS.map((s, i) => {
        const done = s.n < step
        const current = s.n === step
        return (
          <li key={s.n} className="contents">
            {i > 0 && <span aria-hidden="true" className="w-7 h-px bg-line" />}
            <span className={`flex items-center gap-2 ${current ? 'text-preset' : done ? 'text-ink' : 'text-ink-mute'}`} aria-current={current ? 'step' : undefined}>
              <span
                className={`w-[26px] h-[26px] rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                  current ? 'bg-preset text-preset-ink' : done ? 'bg-fx text-[#04241A]' : 'border border-line-strong'
                }`}
              >
                {done ? '✓' : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

type Props = {
  output: UseOutputReturn
  onCreate: (config: ControllerConfig) => void
  onImport: () => void
}

export function SetupWizard({ output, onCreate, onImport }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [type, setType] = useState<PedalboardType>('pocketMaster')
  const [transport, setTransport] = useState<'usb' | 'bt'>('usb')
  const [templateId, setTemplateId] = useState('starter')
  const [nPresets, setNPresets] = useState(4)
  const [nFx, setNFx] = useState(6)
  const [showTap, setShowTap] = useState(true)
  const [showLooper, setShowLooper] = useState(true)
  const [lastTest, setLastTest] = useState<string | null>(null)
  const profile = PROFILES[type]
  const { midi, bt } = output

  const testMsg = profile.presetMidi(profile.presetRange[0], 1)
  const sendTest = () => {
    output.send(testMsg, 'Setup test')
    setLastTest(`TX ch 1 · ${describeMidi(testMsg)}`)
  }

  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!
    setTemplateId(id)
    setNPresets(t.presets)
    setNFx(t.fx)
  }

  const create = () =>
    onCreate(buildInitialConfig({ type, presets: nPresets, fx: nFx, showTapDelay: profile.hasTapDelay && showTap, showLooper }))

  const previewFx = Array.from({ length: nFx }, (_, i) => makeFxPad(profile, i, 1).name)

  return (
    <div className="min-h-dvh bg-ground flex flex-col">
      <header className="flex items-center gap-3 px-5 sm:px-8 py-[18px] border-b border-line-soft">
        <Logo />
        <span className="text-[15px] font-bold">Universal MIDI Controller</span>
      </header>

      <main className="flex-1 box-border px-5 sm:px-8 py-8 sm:py-10 flex flex-wrap gap-10 sm:gap-12 justify-center content-start">
        <section className="flex-[1_1_520px] max-w-[660px] min-w-0 flex flex-col gap-7">
          <Steps step={step} />

          {step === 1 && (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="m-0 text-[28px] sm:text-4xl font-bold tracking-[-0.02em] leading-tight">Which pedalboard are you controlling?</h1>
                <p className="m-0 text-base leading-normal text-ink-dim">
                  Pick a profile and the app fills in the right MIDI commands for you. You can change anything later.
                </p>
              </div>
              <div role="radiogroup" aria-label="Pedalboard" className="flex flex-col gap-3">
                {PROFILE_ORDER.map((t) => {
                  const p = PROFILES[t]
                  const on = t === type
                  return (
                    <label
                      key={t}
                      className={`flex items-start gap-4 p-[18px] rounded-pad cursor-pointer ${
                        on ? 'border-2 border-preset bg-preset/7' : 'border border-line bg-surface'
                      }`}
                    >
                      <input type="radio" name="pedalboard" checked={on} onChange={() => setType(t)} className="w-5 h-5 mt-[3px] accent-preset" />
                      <span className="flex flex-col gap-2 flex-1 min-w-0">
                        <span className="text-lg font-bold">{p.label}</span>
                        <span className="flex flex-wrap gap-1.5">
                          {p.features.map((f) => (
                            <span
                              key={f}
                              className={`text-xs font-semibold rounded-full px-2.5 py-[3px] border ${
                                on ? 'text-warn-ink border-preset/40' : 'text-ink-dim border-line'
                              }`}
                            >
                              {f}
                            </span>
                          ))}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={() => setStep(2)}>Continue</Button>
                <Button variant="ghost" size="lg" onClick={onImport}>Import a saved setup</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="m-0 text-[28px] sm:text-4xl font-bold tracking-[-0.02em] leading-tight">Connect your pedalboard</h1>
                <p className="m-0 text-base leading-normal text-ink-dim">
                  USB gives the tightest timing. Bluetooth works too, with a few milliseconds of lag.
                </p>
              </div>
              <Segmented
                label="Connection type"
                options={[
                  { value: 'usb', label: 'USB' },
                  { value: 'bt', label: 'Bluetooth' },
                ]}
                value={transport}
                onChange={setTransport}
                className="max-w-[320px]"
              />
              <ol className="list-none m-0 p-0 flex flex-col gap-3.5">
                {(transport === 'usb'
                  ? [
                      ['Plug in the USB cable and power on the pedal', 'Use a data cable, not a charge-only one.'],
                      ['Allow MIDI access when the browser asks', 'Nothing is sent anywhere except to your device.'],
                      ['Select it in the list', 'Then send a test message to make sure it responds.'],
                    ]
                  : [
                      ['Turn on Bluetooth MIDI on the pedal', 'Check the pedal manual if it needs pairing mode.'],
                      ['Press Pair device and pick it', 'The browser shows its own device picker.'],
                      ['Send a test message', 'The pedal should switch to its first preset.'],
                    ]
                ).map(([title, sub], i) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="w-7 h-7 shrink-0 rounded-full border border-line-strong flex items-center justify-center font-mono text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{title}</span>
                      <span className="text-[13px] text-ink-dim">{sub}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button size="lg" variant="primary" onClick={() => setStep(3)}>Continue</Button>
                <button type="button" onClick={() => setStep(3)} className="h-13 px-2 text-sm text-ink-dim hover:text-ink cursor-pointer">
                  Skip, I will connect later
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="m-0 text-[28px] sm:text-4xl font-bold tracking-[-0.02em] leading-tight">Shape your controller</h1>
                <p className="m-0 text-base leading-normal text-ink-dim">
                  Start from a template or set the counts yourself. Adding or removing pads later takes one click.
                </p>
              </div>
              <div role="radiogroup" aria-label="Template" className="grid grid-cols-3 gap-3">
                {TEMPLATES.map((t) => {
                  const on = t.id === templateId
                  return (
                    <label
                      key={t.id}
                      className={`flex flex-col gap-1 p-3.5 rounded-xl cursor-pointer ${on ? 'border-2 border-preset bg-preset/7' : 'border border-line bg-surface'}`}
                    >
                      <input type="radio" name="template" checked={on} onChange={() => applyTemplate(t.id)} className="sr-only" />
                      <span className="text-[15px] font-bold">{t.label}</span>
                      <span className="text-xs text-ink-dim">{t.presets} presets · {t.fx} FX</span>
                    </label>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-8">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Preset pads</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Stepper label="presets" value={nPresets} min={1} max={16} onChange={(n) => { setNPresets(n); setTemplateId('') }} />
                    <span className="text-xs text-ink-dim">1–16</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>FX pads</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Stepper label="FX" value={nFx} min={0} max={16} onChange={(n) => { setNFx(n); setTemplateId('') }} />
                    <span className="text-xs text-ink-dim">0–16</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {profile.hasTapDelay && (
                  <label className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-line bg-surface cursor-pointer">
                    <input type="checkbox" checked={showTap} onChange={(e) => setShowTap(e.target.checked)} className="w-5 h-5 accent-preset" />
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">Tap delay block</span>
                      <span className="text-xs text-ink-dim">Sets the pedal delay time from your taps</span>
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-line bg-surface cursor-pointer">
                  <input type="checkbox" checked={showLooper} onChange={(e) => setShowLooper(e.target.checked)} className="w-5 h-5 accent-preset" />
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">Looper block</span>
                    <span className="text-xs text-ink-dim">Click, BPM and loop controls</span>
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button size="lg" variant="primary" onClick={create}>Create controller</Button>
              </div>
            </>
          )}
        </section>

        <aside aria-label={step === 2 ? 'Devices' : 'Preview'} className="flex-[1_1_360px] max-w-[440px] min-w-0 flex flex-col gap-3">
          {step === 2 ? (
            <>
              {transport === 'usb' ? (
                <div className="bg-surface border border-line-soft rounded-[20px] p-[18px] flex flex-col gap-3.5">
                  <h2 className="m-0 text-[13px] font-bold tracking-[0.14em] uppercase">MIDI outputs</h2>
                  <DeviceList outputs={midi.outputs} selectedOutputId={midi.selectedOutputId} onSelect={midi.setSelectedOutputId} error={midi.error} />
                </div>
              ) : (
                <div className="bg-surface border border-line-soft rounded-[20px] p-[18px] flex flex-col gap-3.5">
                  <h2 className="m-0 text-[13px] font-bold tracking-[0.14em] uppercase">Bluetooth</h2>
                  {!bt.isSupported ? (
                    <p className="m-0 text-[13px] text-ink-dim">This browser does not support Web Bluetooth. Try Chrome or use USB.</p>
                  ) : bt.device ? (
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-[15px] font-bold truncate">{bt.device.name}</span>
                      <span className="text-xs font-bold text-fx">Connected</span>
                    </div>
                  ) : (
                    <Button onClick={bt.connect} disabled={bt.isConnecting} className="self-start">
                      {bt.isConnecting ? 'Connecting…' : 'Pair device'}
                    </Button>
                  )}
                  {bt.connectError && <span className="text-xs text-panic">{bt.connectError}</span>}
                </div>
              )}
              <div className="bg-surface border border-line-soft rounded-[20px] p-[18px] flex flex-col gap-2.5">
                <span className="text-[15px] font-semibold">Test the connection</span>
                <span className="text-[13px] text-ink-dim">
                  Sends {describeMidi(testMsg)} on channel 1. The pedal should switch to its first preset.
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={sendTest} disabled={output.connection.kind === 'none'}>Send test message</Button>
                  {lastTest && <span className="font-mono text-xs text-fx">{lastTest}</span>}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold tracking-[0.12em] uppercase text-ink-dim">
                {step === 1 ? 'What you will get' : 'Live preview'}
              </span>
              <div className="bg-surface border border-line-soft rounded-[20px] p-[18px] flex flex-col gap-3.5">
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: step === 1 ? 4 : nPresets }, (_, i) => (
                    <div
                      key={i}
                      className={`box-border min-h-16 rounded-[10px] px-2.5 py-2 flex flex-col justify-between ${
                        i === 0 ? 'bg-preset text-preset-ink border border-preset-hi' : 'bg-surface-2 border border-line'
                      }`}
                    >
                      {step === 3 && (
                        <>
                          <span className="font-mono text-[11px] font-bold opacity-70">{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-xs font-bold truncate">Preset {i + 1}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {(step === 1 ? 6 : nFx) > 0 && (
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: step === 1 ? 6 : nFx }, (_, i) => (
                      <div
                        key={i}
                        className={`min-h-10 rounded-lg flex items-center justify-center px-1 ${
                          step === 1 && [0, 1, 4].includes(i) ? 'bg-fx-deep border border-fx-line' : 'bg-surface-2 border border-line'
                        }`}
                      >
                        {step === 3 && <span className="text-[10px] font-bold truncate">{previewFx[i]}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  {(step === 1 ? profile.hasTapDelay : profile.hasTapDelay && showTap) && (
                    <div className="flex-1 min-h-12 rounded-[10px] bg-surface-2 border border-line flex items-center justify-between px-3 text-[11px] font-bold">
                      <span>TAP DELAY</span>
                      <span className="font-mono text-ink-dim">-- BPM</span>
                    </div>
                  )}
                  {(step === 1 || showLooper) && (
                    <div className="flex-1 min-h-12 rounded-[10px] bg-surface-2 border border-line flex items-center justify-between px-3 text-[11px] font-bold">
                      <span>LOOPER</span>
                      <span className="font-mono text-ink-dim">Off</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[13px] text-ink-dim">
                {step === 1
                  ? type === 'outros'
                    ? 'Pads start blank: you set channel, type and value for each one.'
                    : `Preset pads send ${profile.label} preset commands and FX pads use its effect names.`
                  : 'Pad names and MIDI values are starting points. Rename them in Edit mode.'}
              </span>
            </>
          )}
        </aside>
      </main>
    </div>
  )
}
