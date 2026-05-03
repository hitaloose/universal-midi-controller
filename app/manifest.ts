import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MIDI Controller',
    short_name: 'MIDI Ctrl',
    description: 'Controlador MIDI universal para pedaleiras',
    start_url: '/universal-midi-controller/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/universal-midi-controller/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/universal-midi-controller/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
