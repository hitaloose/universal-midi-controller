export type Song = {
  /** The file name, so re-importing the folder updates songs instead of duplicating them. */
  id: string
  title: string
  artist: string
  key?: string
  capo?: string
  /** Blocks are separated by blank lines in the file; each block is a list of lines. */
  blocks: string[][]
}

export type InlineToken = { text: string; bold?: boolean; italic?: boolean }

const BOLD_LINE = /^\*\*(.+)\*\*$/
const ITALIC_LINE = /^\*([^*].*)\*$/
const KEY_LINE = /^(?:Tom|Key):\s*(.+)$/i
const CAPO_LINE = /^(?:Capotraste|Capo):\s*(.+)$/i
const SECTION_LINE = /^\[[^\]]+\]$/

const stripMarks = (s: string) => s.replace(/\*+/g, '').trim()

/** "Lonely Day - System Of A Down.md" → title and artist, used when the header is missing. */
function fromFileName(fileName: string) {
  const base = fileName.replace(/\.md$/i, '')
  const sep = base.lastIndexOf(' - ')
  return sep === -1 ? { title: base, artist: '' } : { title: base.slice(0, sep), artist: base.slice(sep + 3) }
}

/**
 * Parses a chord sheet: an optional header (`**Title**`, `*Artist*`, `Tom: **Am**`, `Capotraste: **1ª casa**`)
 * followed by blocks of lines where chords are written in `**bold**`.
 */
export function parseSong(fileName: string, text: string): Song {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd())
  const fallback = fromFileName(fileName)
  let title = ''
  let artist = ''
  let key: string | undefined
  let capo: string | undefined

  // The header is the leading lines that look like title / artist / key / capo, blank lines between them allowed.
  // Key and capo can come in either order.
  let i = 0
  for (; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const started = key || capo
    if (!title && !artist && !started && BOLD_LINE.test(line)) title = stripMarks(line)
    else if (!artist && !started && ITALIC_LINE.test(line)) artist = stripMarks(line)
    else if (!key && KEY_LINE.test(line)) key = stripMarks(line.match(KEY_LINE)![1])
    else if (!capo && CAPO_LINE.test(line)) capo = stripMarks(line.match(CAPO_LINE)![1])
    else break
  }

  const blocks: string[][] = []
  let block: string[] = []
  for (const line of lines.slice(i)) {
    if (line.trim()) block.push(line)
    else if (block.length) {
      blocks.push(block)
      block = []
    }
  }
  if (block.length) blocks.push(block)

  return {
    id: fileName,
    title: title || fallback.title,
    artist: artist || fallback.artist,
    key,
    capo,
    blocks,
  }
}

/** `[refrão]`, `[Ponte]`: a section label rather than a lyric line. */
export function isSectionLine(line: string): boolean {
  return SECTION_LINE.test(line.trim())
}

/** Splits a line into plain, `**bold**` (chords) and `*italic*` runs. */
export function tokenizeLine(line: string): InlineToken[] {
  const tokens: InlineToken[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) tokens.push({ text: line.slice(last, m.index) })
    tokens.push(m[1] !== undefined ? { text: m[1], bold: true } : { text: m[2], italic: true })
    last = re.lastIndex
  }
  if (last < line.length) tokens.push({ text: line.slice(last) })
  return tokens
}
