'use client'

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { PresetPad, SongbookBindings } from '@/lib/types'
import { isSectionLine, tokenizeLine, type Song } from '@/lib/chordSheet'
import type { UseSongbookReturn } from '@/hooks/useSongbook'
import { Button } from '@/components/ui/Button'
import { KeyCap } from '@/components/ui/KeyCap'
import { PresetColumn, type PresetControl } from '@/components/songbook/PresetColumn'
import { ChevronLeft, ChevronRight, CloseIcon } from '@/components/ui/icons'

const LINE_HEIGHT = 1.45
const COL_GAP = 40
const MAX_COLUMNS = 2

/** A run of lines from one block; blocks only split when they are taller than a column. */
type Segment = { block: number; from: number; to: number }
type Column = Segment[]

/** Fills columns top to bottom with whole blocks, splitting a block by line only when it can't fit a column on its own. */
function paginate(lineHeights: number[][], height: number, gap: number): Column[] {
  const columns: Column[] = [[]]
  let used = 0
  lineHeights.forEach((lines, block) => {
    const blockH = lines.reduce((a, b) => a + b, 0)
    const col = columns[columns.length - 1]
    const g = col.length ? gap : 0
    if (used + g + blockH <= height) {
      col.push({ block, from: 0, to: lines.length })
      used += g + blockH
      return
    }
    if (blockH <= height) {
      columns.push([{ block, from: 0, to: lines.length }])
      used = blockH
      return
    }
    let from = 0
    lines.forEach((h, l) => {
      const cur = columns[columns.length - 1]
      const startsSegment = l === from
      const lg = startsSegment && cur.length ? gap : 0
      if (used + lg + h > height && (cur.length > 0 || !startsSegment)) {
        if (!startsSegment) cur.push({ block, from, to: l })
        columns.push([])
        used = h
        from = l
      } else used += lg + h
    })
    columns[columns.length - 1].push({ block, from, to: lines.length })
  })
  return columns
}

function Line({ text }: { text: string }) {
  if (isSectionLine(text)) {
    // Sized in em so it scales with the reader's text size.
    return <div className="text-[0.7em] font-bold uppercase tracking-[0.14em] text-ink-dim">{text.trim().slice(1, -1)}</div>
  }
  return (
    <div className="whitespace-pre-wrap break-words">
      {tokenizeLine(text).map((t, i) =>
        t.bold ? (
          <b key={i} className="text-preset font-bold">
            {t.text}
          </b>
        ) : t.italic ? (
          <i key={i}>{t.text}</i>
        ) : (
          <Fragment key={i}>{t.text}</Fragment>
        ),
      )}
      {/* Keeps empty-looking lines one line tall so measuring matches rendering. */}
      {'​'}
    </div>
  )
}

type Layout = { songId: string; columns: Column[]; perPage: number }

function useLayout(song: Song | undefined, fontSize: number) {
  const areaRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [layout, setLayout] = useState<Layout | null>(null)

  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const perPage = Math.max(1, Math.min(MAX_COLUMNS, Math.floor((size.w + COL_GAP) / (fontSize * 18 + COL_GAP))))
  const colWidth = (size.w - (perPage - 1) * COL_GAP) / perPage
  const gap = Math.round(fontSize * 0.8)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!song || !el || !size.h) return
    const heights = Array.from(el.children).map((b) => Array.from(b.children).map((l) => l.getBoundingClientRect().height))
    setLayout({ songId: song.id, columns: paginate(heights, size.h, gap), perPage })
  }, [song, size.h, colWidth, fontSize, gap, perPage])

  const measurer = song && (
    <div
      ref={measureRef}
      aria-hidden="true"
      className="absolute invisible pointer-events-none left-0 top-0"
      style={{ width: colWidth, fontSize, lineHeight: LINE_HEIGHT }}
    >
      {song.blocks.map((block, b) => (
        <div key={b}>
          {block.map((line, l) => (
            <Line key={l} text={line} />
          ))}
        </div>
      ))}
    </div>
  )

  return { areaRef, measurer, layout: layout && song && layout.songId === song.id ? layout : null, gap }
}

type Props = {
  songbook: UseSongbookReturn
  presets: PresetPad[]
  fontSize: number
  onFontSize: (size: number) => void
  bindings: SongbookBindings
  presetControl: PresetControl
}

export function SongReader({ songbook, presets, fontSize, onFontSize, bindings, presetControl }: Props) {
  const { run, current, songsById } = songbook
  const song = current ? songsById.get(current.songId) : undefined
  const { areaRef, measurer, layout, gap } = useLayout(song, fontSize)

  const pages: Column[][] = []
  if (layout) for (let i = 0; i < layout.columns.length; i += layout.perPage) pages.push(layout.columns.slice(i, i + layout.perPage))
  const pageCount = Math.max(1, pages.length)

  const { reportPageCount } = songbook
  useEffect(() => {
    if (layout && current) reportPageCount(layout.songId, Math.max(1, Math.ceil(layout.columns.length / layout.perPage)))
  }, [layout, current, reportPageCount])

  if (!run || !current) return null
  const page = Math.min(run.page, pageCount - 1)
  const nextItem = run.queue[run.index + 1]
  const nextSong = nextItem && songsById.get(nextItem.songId)
  const presetName = (id?: string) => presets.find((p) => p.id === id)?.name
  const { menuOpen } = run

  return (
    <div className="h-[calc(100dvh-145px)] md:h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex">
        {/* The setlist menu covers the song but not the footer or the presets, so those stay reachable. */}
        <div className="relative flex-1 min-w-0 flex flex-col">
          <header className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 sm:px-6 py-3 border-b border-line-soft bg-bar">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold truncate">{song?.title ?? current.songId}</div>
              <div className="text-[13px] text-ink-dim truncate">
                {song?.artist}
                {song?.key && (
                  <>
                    {' · '}Key <b className="text-preset">{song.key}</b>
                  </>
                )}
                {song?.capo && (
                  <>
                    {' · '}Capo <b className="text-ink">{song.capo}</b>
                  </>
                )}
                {presetName(current.presetId) && <> · Preset {presetName(current.presetId)}</>}
              </div>
            </div>
            <div className="flex flex-col items-end text-[13px] text-ink-dim tabular-nums">
              <span>
                Page <b className="text-ink">{page + 1}/{pageCount}</b> · Song <b className="text-ink">{run.index + 1}/{run.queue.length}</b>
              </span>
              <span className="truncate max-w-[40ch]">Next: {nextSong ? nextSong.title : 'end of setlist'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" aria-label="Smaller text" onClick={() => onFontSize(Math.max(14, fontSize - 2))}>
                A−
              </Button>
              <Button size="sm" aria-label="Larger text" onClick={() => onFontSize(Math.min(48, fontSize + 2))}>
                A+
              </Button>
              <Button size="sm" variant="ghost" aria-label="Close setlist" onClick={songbook.stop}>
                <CloseIcon size={16} />
              </Button>
            </div>
          </header>

          <div className="relative flex-1 min-h-0 px-4 sm:px-6 py-4">
            <div ref={areaRef} className="relative h-full overflow-hidden">
              {measurer}
              {song ? (
                <div className="flex h-full" style={{ gap: COL_GAP, fontSize, lineHeight: LINE_HEIGHT }}>
                  {(pages[page] ?? []).map((col, c) => (
                    <div key={c} className="flex-1 min-w-0">
                      {col.map((seg, i) => (
                        <div key={`${seg.block}-${seg.from}`} style={{ marginTop: i ? gap : 0 }}>
                          {song.blocks[seg.block].slice(seg.from, seg.to).map((line, l) => (
                            <Line key={l} text={line} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-dim">This song is no longer in the library. Import its file again.</p>
              )}
            </div>
            {/* Touch fallback for the pedal: left third goes back, the rest goes forward. */}
            <button type="button" aria-label="Previous page" onClick={songbook.prev} className="absolute inset-y-0 left-0 w-1/3 cursor-pointer opacity-0" />
            <button type="button" aria-label="Next page" onClick={songbook.next} className="absolute inset-y-0 right-0 w-2/3 cursor-pointer opacity-0" />
          </div>

          {menuOpen && <SetlistMenu songbook={songbook} presetName={presetName} />}
        </div>

        <aside aria-label="Presets" className="hidden sm:block w-[180px] shrink-0 border-l border-line-soft bg-bar">
          <PresetColumn presets={presets} control={presetControl} />
        </aside>
      </div>

      <footer className="shrink-0 grid grid-cols-4 gap-2 px-4 sm:px-6 py-3 border-t border-line-soft bg-bar">
        <FooterButton label={menuOpen ? 'Up' : 'Prev'} code={bindings.prev} onClick={songbook.prev}>
          <ChevronLeft size={18} />
        </FooterButton>
        <FooterButton label={menuOpen ? 'Close' : 'Setlist'} code={bindings.menu} onClick={songbook.menu} />
        <FooterButton label="Play next" code={bindings.confirm} onClick={songbook.confirm} disabled={!menuOpen} primary={menuOpen} />
        <FooterButton label={menuOpen ? 'Down' : 'Next'} code={bindings.next} onClick={songbook.next} iconAfter>
          <ChevronRight size={18} />
        </FooterButton>
      </footer>
    </div>
  )
}

/** On-screen twin of a pedal button, showing the key it is bound to. */
function FooterButton({
  label,
  code,
  onClick,
  disabled,
  primary,
  iconAfter,
  children,
}: {
  label: string
  code?: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  iconAfter?: boolean
  children?: ReactNode
}) {
  return (
    <Button variant={primary ? 'primary' : 'secondary'} size="lg" disabled={disabled} onClick={onClick} className="px-2 min-w-0">
      {!iconAfter && children}
      <span className="truncate">{label}</span>
      {iconAfter && children}
      <KeyCap code={code} tone={primary ? 'onAmber' : 'idle'} className="hidden sm:inline" />
    </Button>
  )
}

/** Not an aria-modal dialog on purpose: the pedal keys must keep working while it is open. */
function SetlistMenu({ songbook, presetName }: { songbook: UseSongbookReturn; presetName: (id?: string) => string | undefined }) {
  const { run, songsById } = songbook
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    listRef.current?.querySelector('[data-cursor="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [run?.cursor])

  if (!run) return null
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-ground/95 backdrop-blur-sm" role="region" aria-label="Setlist">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-line-soft">
        <h2 className="m-0 text-lg font-bold">Setlist</h2>
        <span className="text-[13px] text-ink-dim">Pick a song to play it next</span>
      </div>
      <ol ref={listRef} className="flex-1 overflow-y-auto m-0 p-3 sm:px-6 list-none flex flex-col gap-1.5">
        {run.queue.map((item, i) => {
          const song = songsById.get(item.songId)
          const isCursor = i === run.cursor
          const isCurrent = i === run.index
          return (
            <li key={`${item.songId}-${i}`} data-cursor={isCursor}>
              <button
                type="button"
                onClick={() => songbook.pick(i)}
                className={`w-full flex items-center gap-4 text-left px-4 py-3 rounded-xl border cursor-pointer ${
                  isCursor ? 'border-preset bg-preset/10' : 'border-line-soft bg-surface'
                } ${i < run.index ? 'opacity-50' : ''}`}
              >
                <span className="font-mono text-ink-dim w-7 text-right tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[17px] font-bold truncate">{song?.title ?? item.songId}</span>
                  <span className="block text-[13px] text-ink-dim truncate">
                    {song?.artist}
                    {presetName(item.presetId) && ` · ${presetName(item.presetId)}`}
                  </span>
                </span>
                {isCurrent && <span className="text-xs font-bold uppercase tracking-[0.1em] text-preset">Now</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
