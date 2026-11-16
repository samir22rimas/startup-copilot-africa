/**
 * A small Markdown reader for exports. It turns the Markdown the AI produces
 * (headings, paragraphs, lists, quotes, tables, bold/italic) into plain blocks
 * that the PDF, Word and PowerPoint writers each lay out in their own way.
 */

export type Run = { text: string; bold?: boolean; italic?: boolean }

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; runs: Run[] }
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "bullet"; runs: Run[]; depth: number }
  | { kind: "numbered"; runs: Run[]; marker: string; depth: number }
  | { kind: "quote"; runs: Run[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "rule" }

/** Inline Markdown → styled runs. Links keep their text; code ticks are dropped. */
export function parseInline(source: string): Run[] {
  const text = source
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")

  const runs: Run[] = []
  // ***bold italic***, **bold**, __bold__, *italic*, _italic_
  const pattern = /(\*\*\*|___)(.+?)\1|(\*\*|__)(.+?)\3|(\*|_)(?=\S)(.+?)(?<=\S)\5/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    // A lone underscore inside a word (snake_case) is not emphasis.
    if (match[5] === "_" && /\w/.test(text[index - 1] ?? "")) continue
    if (index > last) runs.push({ text: text.slice(last, index) })
    if (match[2] !== undefined) runs.push({ text: match[2], bold: true, italic: true })
    else if (match[4] !== undefined) runs.push({ text: match[4], bold: true })
    else if (match[6] !== undefined) runs.push({ text: match[6], italic: true })
    last = index + match[0].length
  }
  if (last < text.length) runs.push({ text: text.slice(last) })
  return runs.filter((run) => run.text.length > 0)
}

export function runsToText(runs: Run[]): string {
  return runs.map((run) => run.text).join("")
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => runsToText(parseInline(cell.trim())))
}

const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n")
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const runs = parseInline(paragraph.join(" "))
    if (runs.length) blocks.push({ kind: "paragraph", runs })
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    if (!line) {
      flushParagraph()
      continue
    }

    // Table: a row of cells followed by a |---|---| divider.
    if (line.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      flushParagraph()
      const header = splitTableRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim().includes("|")) {
        const cells = splitTableRow(lines[i])
        // Pad or trim so every row has the header's number of columns.
        rows.push(header.map((_, column) => cells[column] ?? ""))
        i++
      }
      i--
      blocks.push({ kind: "table", header, rows })
      continue
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line)
    if (heading) {
      flushParagraph()
      const level = Math.min(3, heading[1].length) as 1 | 2 | 3
      blocks.push({ kind: "heading", level, runs: parseInline(heading[2]) })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph()
      blocks.push({ kind: "rule" })
      continue
    }

    const depth = Math.min(2, Math.floor((raw.length - raw.trimStart().length) / 2))

    const bullet = /^[-*+•]\s+(.*)$/.exec(line)
    if (bullet) {
      flushParagraph()
      blocks.push({ kind: "bullet", runs: parseInline(bullet[1]), depth })
      continue
    }

    const numbered = /^(\d{1,3})[.)]\s+(.*)$/.exec(line)
    if (numbered) {
      flushParagraph()
      blocks.push({ kind: "numbered", marker: `${numbered[1]}.`, runs: parseInline(numbered[2]), depth })
      continue
    }

    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushParagraph()
      const runs = parseInline(quote[1])
      const previous = blocks[blocks.length - 1]
      // Consecutive quote lines form one quotation; a bare ">" starts a new paragraph in it.
      if (previous?.kind === "quote" && lines[i - 1]?.trim().startsWith(">")) {
        if (runs.length) previous.runs.push({ text: " " }, ...runs)
      } else if (runs.length) {
        blocks.push({ kind: "quote", runs })
      }
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  return blocks
}
