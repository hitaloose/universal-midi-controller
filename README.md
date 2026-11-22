# Universal MIDI Controller

Turn a phone, tablet or laptop into a MIDI foot controller for your pedalboard, straight from the browser — no app, no driver, nothing to install.

**[Open the app →](https://hitaloose.github.io/universal-midi-controller/)** (Chrome or Edge)

## Features

- **Preset pads** — each one sends a MIDI message and sets which FX start on or off; on the Pocket Master CFW they can also show scene and STOMP buttons
- **FX pads** — toggles that send their own on/off messages; double-click an active preset for **solo mode**
- **Banks** and layout templates (Starter, Compact, Big rig), with an edit mode to add, move and rename pads
- **Tap tempo**, sent to the device's delay
- **Tempo-synced looper** with metronome click: record and overdub stop at the end of the bar, with latency compensation and loop trim
- **Songbook** — setlists and a paginated chord-sheet reader you can turn with a Bluetooth page-turner pedal, next to your preset pads
- **USB or Bluetooth MIDI**, a **MIDI monitor**, and keyboard bindings for every action (so a pedal that sends keys works too)
- **Setup wizard** and **export / import** of the whole configuration as JSON
- **PWA** — install it on the home screen and use it offline

## Supported devices

Ready-made profiles for the **Sonicake Pocket Master**, the **Pocket Master CFW** and the **Valeton GP-5** (FX names, CC numbers, looper commands), plus a generic profile for any device that takes Program Change and Control Change messages. The MIDI tables used are in [`docs/`](docs/).

### Pocket Master CFW

For a Pocket Master running the [**Pocket Master CFW**](https://pocketmaster-cfw.guitar-training-generator.com/#top) custom firmware, with the pedal's MIDI map left on **Stock** (Settings → MIDI → MIDI MAP). It follows the [CFW MIDI guide](https://pocketmaster-cfw.guitar-training-generator.com/midi/):

- Presets and block on/off use the same CCs as the stock firmware, plus shortcuts for **Freeze** (CC 114), **Global EQ** (CC 86), **Drum play** (CC 93) and **DLY Sync** (CC 87)
- **Tap delay** turns the delay's Sync on, sets the note (1/4, dotted 1/8 or 1/8 via CC 27/28/29) and sends the tapped tempo with CC 68/69, so no SysEx is needed. The CFW accepts 40–260 BPM. The note CC also counts as a tap on the pedal, so it is only sent when the subdivision changes, when tap delay is turned on or after a preset change, and never twice within 2 s
- **Tempo per preset** — the CFW keeps a BPM and delay note in each preset but can't report them over MIDI, so the app keeps its own copy per preset pad. Tapping (or changing the subdivision) while a preset is active stores the tempo in it, and selecting the preset sends it again. A preset without a stored tempo sends nothing, so the pedal plays the tempo saved in it. You can also set or clear the tempo in the preset inspector. Values sent over MIDI mark the pedal's preset as edited (`*`); save it on the pedal if you want the pedal to keep them on its own
- **Modes per preset** — each preset turns **Solo**, **Scenes** and **STOMP** on or off in the preset inspector. Scenes add BASE / SC1 / SC2 buttons (CC 85 / 82 / 83) with an on/off list of FX pads per scene, so the pads follow the scene the pedal recalls; factory presets (F01–F50) can't store scenes. STOMP adds FS1 / FS2 buttons (CC 80 / 81) that toggle the block groups set on the pedal, starting from the state you mark as "On at start". Both work in any footswitch mode, and every button can have a keyboard key. Set **SAME AGAIN** to OFF on the pedal so nothing else changes the scene behind the app's back

## Stack

[Next.js 16](https://nextjs.org/) (App Router, static export) · [React 19](https://react.dev/) · TypeScript · [Tailwind CSS v4](https://tailwindcss.com/) · [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) · Web Bluetooth · Service Worker

## Running locally

```bash
npm install
npm run dev     # http://localhost:3000/universal-midi-controller
```

`npm run build` writes the static site to `out/`.

> Web MIDI needs a supporting browser (Chrome/Edge) and, on some systems, explicit permission to access MIDI devices.

## Deploy

Every push to `main` publishes to GitHub Pages through GitHub Actions. To deploy a fork, go to **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Bump the cache version in `public/sw.js` with each release so installed PWAs pick up the new build.

## Acknowledgements

Tap-delay support for the **Sonicake Pocket Master** (via SysEx) was only possible thanks to the reverse engineering documented in [**suckyble/PocketEdit**](https://github.com/suckyble/PocketEdit), which mapped the SysEx commands the official app uses to set the delay time.
