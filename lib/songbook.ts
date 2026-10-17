import type { SetlistItem, SongbookConfig } from './types'

export const DEFAULT_SONGBOOK: SongbookConfig = {
  setlists: [],
  fontSize: 22,
  // Most Bluetooth page-turner pedals send arrow keys.
  bindings: { prev: 'ArrowLeft', next: 'ArrowRight', menu: 'ArrowUp', confirm: 'ArrowDown' },
}

export function resolveSongbookConfig(songbook: SongbookConfig | undefined): SongbookConfig {
  // Default keys only apply until the songbook is first saved, so a removed key stays removed.
  return songbook ? { ...DEFAULT_SONGBOOK, ...songbook } : DEFAULT_SONGBOOK
}

/** Page to open when stepping back into a song; clamped once the song is laid out. */
export const LAST_PAGE = Number.MAX_SAFE_INTEGER

/** A single play-through of a setlist. The saved setlist is never modified. */
export type SetlistRun = {
  queue: SetlistItem[]
  index: number
  page: number
  /** Pages of the current song, reported by the reader once it lays the song out. */
  pageCount: number | null
  menuOpen: boolean
  cursor: number
}

export type RunAction =
  | { type: 'start'; items: SetlistItem[] }
  | { type: 'stop' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'menu' }
  | { type: 'confirm' }
  | { type: 'pick'; index: number }
  | { type: 'pageCount'; songId: string; count: number }

const enterSong = (run: SetlistRun, index: number, page = 0): SetlistRun => ({
  ...run,
  index,
  page,
  pageCount: null,
  menuOpen: false,
})

/**
 * Plays `queue[from]` right after the current song without playing it twice:
 * it leaves its spot and is inserted next, and the run moves onto it.
 * A B C D E, on B, jump to E → A B E C D, on E.
 */
export function jumpTo(queue: SetlistItem[], index: number, from: number): { queue: SetlistItem[]; index: number } {
  if (from === index) return { queue, index }
  const item = queue[from]
  const rest = queue.filter((_, i) => i !== from)
  const current = from < index ? index - 1 : index
  rest.splice(current + 1, 0, item)
  return { queue: rest, index: current + 1 }
}

export function runReducer(run: SetlistRun | null, action: RunAction): SetlistRun | null {
  if (action.type === 'start') {
    return action.items.length
      ? { queue: action.items, index: 0, page: 0, pageCount: null, menuOpen: false, cursor: 0 }
      : null
  }
  if (!run || action.type === 'stop') return null

  const last = run.queue.length - 1
  const page = Math.min(run.page, (run.pageCount ?? 1) - 1)

  switch (action.type) {
    case 'next':
      if (run.menuOpen) return { ...run, cursor: Math.min(run.cursor + 1, last) }
      if (page < (run.pageCount ?? 1) - 1) return { ...run, page: page + 1 }
      return run.index < last ? enterSong(run, run.index + 1) : run
    case 'prev':
      if (run.menuOpen) return { ...run, cursor: Math.max(run.cursor - 1, 0) }
      if (page > 0) return { ...run, page: page - 1 }
      return run.index > 0 ? enterSong(run, run.index - 1, LAST_PAGE) : run
    case 'menu':
      // The cursor starts on the upcoming song, the usual one to pull forward.
      return run.menuOpen ? { ...run, menuOpen: false } : { ...run, menuOpen: true, cursor: Math.min(run.index + 1, last) }
    case 'confirm':
      return run.menuOpen ? runReducer(run, { type: 'pick', index: run.cursor }) : run
    case 'pick': {
      if (action.index === run.index) return { ...run, page: 0, menuOpen: false }
      const { queue, index } = jumpTo(run.queue, run.index, action.index)
      return enterSong({ ...run, queue }, index)
    }
    case 'pageCount':
      if (run.queue[run.index]?.songId !== action.songId) return run
      return { ...run, pageCount: action.count, page: Math.min(run.page, action.count - 1) }
  }
}
