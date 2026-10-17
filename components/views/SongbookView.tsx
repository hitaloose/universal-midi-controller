'use client'

import { useRef, useState } from 'react'
import type { PresetPad, Setlist, SongbookBindings, SongbookConfig } from '@/lib/types'
import type { UseSongbookReturn } from '@/hooks/useSongbook'
import { makeId } from '@/lib/utils'
import { KeyBindingField } from '@/components/KeyBindingField'
import { SetlistEditor } from '@/components/songbook/SetlistEditor'
import { SongReader } from '@/components/songbook/SongReader'
import type { PresetControl } from '@/components/songbook/PresetColumn'
import { Card, Hint, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'

type Tab = 'setlists' | 'library' | 'keys'

const BINDING_LABELS: { key: keyof SongbookBindings; label: string }[] = [
  { key: 'prev', label: 'Previous page / song' },
  { key: 'next', label: 'Next page / song' },
  { key: 'menu', label: 'Open / close setlist' },
  { key: 'confirm', label: 'Play selected next' },
]

type Props = {
  songbook: UseSongbookReturn
  config: SongbookConfig
  onChange: (config: SongbookConfig) => void
  presets: PresetPad[]
  presetControl: PresetControl
  otherUsedKeys: Set<string>
}

export function SongbookView({ songbook, config, onChange, presets, presetControl, otherUsedKeys }: Props) {
  const [tab, setTab] = useState<Tab>('setlists')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  if (songbook.run) {
    return (
      <SongReader
        songbook={songbook}
        presets={presets}
        fontSize={config.fontSize}
        onFontSize={(fontSize) => onChange({ ...config, fontSize })}
        bindings={config.bindings}
        presetControl={presetControl}
      />
    )
  }

  const saveSetlist = (setlist: Setlist) => onChange({ ...config, setlists: config.setlists.map((s) => (s.id === setlist.id ? setlist : s)) })
  const editing = config.setlists.find((s) => s.id === editingId)

  if (editing) {
    return (
      <div className="p-4 sm:p-6">
        <SetlistEditor
          setlist={editing}
          songs={songbook.songs}
          songsById={songbook.songsById}
          presets={presets}
          onChange={saveSetlist}
          onDone={() => setEditingId(null)}
        />
      </div>
    )
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    try {
      const count = await songbook.importFiles(files)
      setImportStatus(count ? `Imported ${count} song${count === 1 ? '' : 's'}.` : 'No .md files found.')
    } catch {
      setImportStatus('Could not read the files.')
    } finally {
      e.target.value = ''
    }
  }

  const addSetlist = () => {
    const setlist: Setlist = { id: makeId(), name: `Setlist ${config.setlists.length + 1}`, items: [] }
    onChange({ ...config, setlists: [...config.setlists, setlist] })
    setEditingId(setlist.id)
  }

  const usedKeysFor = (key: keyof SongbookBindings) =>
    new Set([
      ...otherUsedKeys,
      ...(BINDING_LABELS.filter((x) => x.key !== key).map((x) => config.bindings[x.key]).filter(Boolean) as string[]),
    ])

  const setlistUses = (songId: string) => config.setlists.filter((s) => s.items.some((i) => i.songId === songId)).length

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 max-w-5xl">
      <Segmented<Tab>
        label="Songbook section"
        options={[
          { value: 'setlists', label: `Setlists (${config.setlists.length})` },
          { value: 'library', label: `Library (${songbook.songs.length})` },
          { value: 'keys', label: 'Pedal keys' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'setlists' && (
        <Card label="Setlists">
          <div className="flex items-center gap-3">
            <SectionTitle className="flex-1">Setlists</SectionTitle>
            <Button size="sm" onClick={addSetlist}>
              New setlist
            </Button>
          </div>
          {config.setlists.length === 0 && <Hint>Create a setlist, add songs in the order you play them and pick a preset for each one.</Hint>}
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {config.setlists.map((s) => {
              const playable = s.items.filter((i) => songbook.songsById.has(i.songId)).length
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl border border-line-soft bg-ground">
                  <span className="flex-1 min-w-[10rem]">
                    <span className="block font-bold">{s.name || 'Untitled'}</span>
                    <span className="block text-xs text-ink-dim">
                      {s.items.length} song{s.items.length === 1 ? '' : 's'}
                      {playable < s.items.length && ` · ${s.items.length - playable} missing`}
                    </span>
                  </span>
                  <Button variant="primary" size="sm" disabled={!playable} onClick={() => songbook.start(s.items)}>
                    Play
                  </Button>
                  <Button size="sm" onClick={() => setEditingId(s.id)}>
                    Edit
                  </Button>
                  {confirmDeleteId === s.id ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        onChange({ ...config, setlists: config.setlists.filter((x) => x.id !== s.id) })
                        setConfirmDeleteId(null)
                      }}
                    >
                      Confirm delete
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(s.id)}>
                      Delete
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {tab === 'library' && (
        <Card label="Library">
          <div className="flex flex-wrap items-center gap-3">
            <SectionTitle className="flex-1">Chord sheets</SectionTitle>
            <Button size="sm" variant="primary" onClick={() => folderInputRef.current?.click()}>
              Choose folder
            </Button>
            <Button size="sm" onClick={() => filesInputRef.current?.click()}>
              Add files
            </Button>
          </div>
          <Hint>
            Pick the folder with your .md chord sheets. Songs are copied into this device; pick the folder again after editing a file to
            update it.
          </Hint>
          {importStatus && <span className="text-[13px] text-fx">{importStatus}</span>}
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFiles}
            {...({ webkitdirectory: '' } as object)}
          />
          <input ref={filesInputRef} type="file" multiple accept=".md,text/markdown,text/plain" className="hidden" onChange={handleFiles} />
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            {songbook.songs.map((s) => {
              const uses = setlistUses(s.id)
              return (
                <li key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line-soft bg-ground">
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{s.title}</span>
                    <span className="block text-xs text-ink-dim truncate">
                      {s.artist}
                      {s.key && ` · Key ${s.key}`}
                      {uses > 0 && ` · in ${uses} setlist${uses === 1 ? '' : 's'}`}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => songbook.removeSong(s.id)}>
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {tab === 'keys' && (
        <Card label="Pedal keys">
          <SectionTitle>Pedal keys</SectionTitle>
          <Hint>
            Bluetooth page-turner pedals send keyboard keys. Press each pedal button to assign it. With the setlist open, Previous / Next
            move the selection and Play selected next pulls that song in right after the current one.
          </Hint>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {BINDING_LABELS.map(({ key, label }) => (
              <KeyBindingField
                key={key}
                label={label}
                value={config.bindings[key]}
                usedKeys={usedKeysFor(key)}
                onChange={(code) => onChange({ ...config, bindings: { ...config.bindings, [key]: code } })}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
