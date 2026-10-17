'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { SetlistItem } from '@/lib/types'
import type { Song } from '@/lib/chordSheet'
import { deleteSong, listSongs, putSongs } from '@/lib/songStore'
import { runReducer, type SetlistRun } from '@/lib/songbook'

type Props = {
  /** Called whenever a different song comes up in the run (not on page turns). */
  onEnterSong: (item: SetlistItem) => void
}

export type UseSongbookReturn = {
  songs: Song[]
  songsById: Map<string, Song>
  /** Imports the .md files among `files` and returns how many were read. */
  importFiles: (files: FileList | File[]) => Promise<number>
  removeSong: (id: string) => void
  run: SetlistRun | null
  current: SetlistItem | null
  start: (items: SetlistItem[]) => void
  stop: () => void
  next: () => void
  prev: () => void
  menu: () => void
  confirm: () => void
  pick: (index: number) => void
  reportPageCount: (songId: string, count: number) => void
}

const byTitle = (a: Song, b: Song) => a.title.localeCompare(b.title)

/** Chord sheet library plus the current setlist run. Lives in ControllerPage so a run survives view changes. */
export function useSongbook({ onEnterSong }: Props): UseSongbookReturn {
  const [songs, setSongs] = useState<Song[]>([])
  const [run, dispatch] = useReducer(runReducer, null)

  useEffect(() => {
    listSongs()
      .then((s) => setSongs(s.sort(byTitle)))
      .catch(() => setSongs([]))
  }, [])

  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const md = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.md'))
    await putSongs(await Promise.all(md.map(async (f) => ({ id: f.name, text: await f.text() }))))
    setSongs(await listSongs().then((s) => s.sort(byTitle)))
    return md.length
  }, [])

  const removeSong = useCallback((id: string) => {
    deleteSong(id).then(() => setSongs((s) => s.filter((x) => x.id !== id)))
  }, [])

  const current = run ? run.queue[run.index] : null

  const onEnterSongRef = useRef(onEnterSong)
  useLayoutEffect(() => {
    onEnterSongRef.current = onEnterSong
  })
  // Keyed on the item itself: turning pages keeps it, moving to another song (or a jump) changes it.
  useEffect(() => {
    if (current) onEnterSongRef.current(current)
  }, [current])

  const start = useCallback(
    (items: SetlistItem[]) => dispatch({ type: 'start', items: items.filter((i) => songsById.has(i.songId)) }),
    [songsById],
  )
  const stop = useCallback(() => dispatch({ type: 'stop' }), [])
  const next = useCallback(() => dispatch({ type: 'next' }), [])
  const prev = useCallback(() => dispatch({ type: 'prev' }), [])
  const menu = useCallback(() => dispatch({ type: 'menu' }), [])
  const confirm = useCallback(() => dispatch({ type: 'confirm' }), [])
  const pick = useCallback((index: number) => dispatch({ type: 'pick', index }), [])
  const reportPageCount = useCallback((songId: string, count: number) => dispatch({ type: 'pageCount', songId, count }), [])

  return { songs, songsById, importFiles, removeSong, run, current, start, stop, next, prev, menu, confirm, pick, reportPageCount }
}
