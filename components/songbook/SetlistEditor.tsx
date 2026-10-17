'use client'

import { useState } from 'react'
import { BANK_IDS, type PresetPad, type Setlist, type SetlistItem } from '@/lib/types'
import type { Song } from '@/lib/chordSheet'
import { bankOf } from '@/hooks/useController'
import { Card, FieldLabel, Hint, SectionTitle, inputClass } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CloseIcon } from '@/components/ui/icons'

type Props = {
  setlist: Setlist
  songs: Song[]
  songsById: Map<string, Song>
  presets: PresetPad[]
  onChange: (setlist: Setlist) => void
  onDone: () => void
}

/** Preset picker for one song; empty keeps whatever preset is active when the song comes up. */
function PresetSelect({ presets, value, onChange }: { presets: PresetPad[]; value?: string; onChange: (id?: string) => void }) {
  return (
    <select
      aria-label="Preset"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className={`${inputClass} h-9 text-[13px] max-w-[11rem]`}
    >
      <option value="">Keep current</option>
      {BANK_IDS.map((bank) => {
        const inBank = presets.filter((p) => bankOf(p) === bank)
        return inBank.length ? (
          <optgroup key={bank} label={`Bank ${bank}`}>
            {inBank.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ) : null
      })}
    </select>
  )
}

export function SetlistEditor({ setlist, songs, songsById, presets, onChange, onDone }: Props) {
  const [query, setQuery] = useState('')
  const inList = new Set(setlist.items.map((i) => i.songId))
  const q = query.trim().toLowerCase()
  const matches = songs.filter((s) => !inList.has(s.id) && (!q || `${s.title} ${s.artist}`.toLowerCase().includes(q)))

  const setItems = (items: SetlistItem[]) => onChange({ ...setlist, items })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= setlist.items.length) return
    const items = [...setlist.items]
    ;[items[i], items[j]] = [items[j], items[i]]
    setItems(items)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <label className="flex-1 flex flex-col gap-1.5">
          <FieldLabel>Setlist name</FieldLabel>
          <input value={setlist.name} onChange={(e) => onChange({ ...setlist, name: e.target.value })} className={inputClass} />
        </label>
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <Card label="Songs in this setlist">
          <SectionTitle>Order ({setlist.items.length})</SectionTitle>
          {setlist.items.length === 0 && <Hint>Add songs from the library.</Hint>}
          <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
            {setlist.items.map((item, i) => {
              const song = songsById.get(item.songId)
              return (
                <li key={item.songId} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line-soft bg-ground">
                  <span className="font-mono text-ink-dim w-6 text-right tabular-nums">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{song?.title ?? item.songId}</span>
                    <span className={`block text-xs truncate ${song ? 'text-ink-dim' : 'text-panic'}`}>{song ? song.artist : 'File missing'}</span>
                  </span>
                  <PresetSelect
                    presets={presets}
                    value={item.presetId}
                    onChange={(presetId) => setItems(setlist.items.map((x, j) => (j === i ? { ...x, presetId } : x)))}
                  />
                  <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === setlist.items.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Remove" onClick={() => setItems(setlist.items.filter((_, j) => j !== i))}>
                    <CloseIcon size={14} />
                  </Button>
                </li>
              )
            })}
          </ol>
        </Card>

        <Card label="Add songs">
          <SectionTitle>Library</SectionTitle>
          <input placeholder="Search title or artist" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} />
          {songs.length === 0 ? (
            <Hint>No songs yet. Import a folder in the Library tab.</Hint>
          ) : (
            matches.length === 0 && <Hint>{q ? 'No matching songs.' : 'Every song is already in this setlist.'}</Hint>
          )}
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5 max-h-[50dvh] overflow-y-auto">
            {matches.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line-soft bg-ground">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{s.title}</span>
                  <span className="block text-xs text-ink-dim truncate">{s.artist}</span>
                </span>
                <Button size="sm" onClick={() => setItems([...setlist.items, { songId: s.id }])}>
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
