import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import { parseMarkdown, type Block, type Run } from "./markdown-blocks"
import { BRAND, MIME, formatExportDate, type DeckExport, type PdfFonts, type ReportExport } from "./types"

const FONT = "DejaVu"

type Rgb = [number, number, number]

function rgb(hex: string): Rgb {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

const COLOR = {
  green: rgb(BRAND.green),
  greenDark: rgb(BRAND.greenDark),
  greenLight: rgb(BRAND.greenLight),
  text: rgb(BRAND.text),
  muted: rgb(BRAND.muted),
  rule: rgb(BRAND.rule),
  white: [255, 255, 255] as Rgb,
}

type Word = { text: string; bold: boolean; space: boolean }

/** Splits styled runs into words, remembering whether a space preceded each. */
function toWords(runs: Run[]): Word[] {
  const words: Word[] = []
  let pendingSpace = false
  for (const run of runs) {
    for (const part of run.text.split(/(\s+)/)) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        pendingSpace = true
        continue
      }
      words.push({ text: part, bold: Boolean(run.bold), space: pendingSpace && words.length > 0 })
      pendingSpace = false
    }
  }
  return words
}

/**
 * Top-to-bottom text flow on a jsPDF document: wraps mixed bold/regular text,
 * tracks the cursor, and starts a new page when the content area is full.
 */
class Flow {
  y: number

  constructor(
    readonly doc: jsPDF,
    readonly left: number,
    readonly right: number,
    readonly top: number,
    readonly bottom: number,
    private readonly onNewPage?: (doc: jsPDF) => void,
  ) {
    this.y = top
  }

  get width() {
    return this.right - this.left
  }

  newPage() {
    this.doc.addPage()
    this.onNewPage?.(this.doc)
    this.y = this.top
  }

  ensure(height: number) {
    if (this.y + height > this.bottom) this.newPage()
  }

  private measure(text: string, bold: boolean, size: number) {
    this.doc.setFont(FONT, bold ? "bold" : "normal")
    this.doc.setFontSize(size)
    return this.doc.getTextWidth(text)
  }

  /** Breaks one over-long word (a URL, say) into pieces that fit the width. */
  private hardWrap(word: Word, size: number, maxWidth: number): Word[] {
    const pieces: Word[] = []
    let current = ""
    for (const char of word.text) {
      if (current && this.measure(current + char, word.bold, size) > maxWidth) {
        pieces.push({ text: current, bold: word.bold, space: pieces.length === 0 && word.space })
        current = char
      } else {
        current += char
      }
    }
    if (current) pieces.push({ text: current, bold: word.bold, space: pieces.length === 0 && word.space })
    return pieces
  }

  layout(runs: Run[], size: number, maxWidth: number, forceBold = false): Word[][] {
    const spaceWidth = this.measure(" ", false, size)
    const lines: Word[][] = []
    let line: Word[] = []
    let lineWidth = 0

    const source = toWords(runs).map((word) => (forceBold ? { ...word, bold: true } : word))
    const words = source.flatMap((word) =>
      this.measure(word.text, word.bold, size) > maxWidth ? this.hardWrap(word, size, maxWidth) : [word],
    )

    for (const word of words) {
      const wordWidth = this.measure(word.text, word.bold, size)
      const gap = line.length > 0 && word.space ? spaceWidth : 0
      if (line.length > 0 && lineWidth + gap + wordWidth > maxWidth) {
        lines.push(line)
        line = [{ ...word, space: false }]
        lineWidth = wordWidth
      } else {
        line.push(word)
        lineWidth += gap + wordWidth
      }
    }
    if (line.length) lines.push(line)
    return lines
  }

  /** Writes wrapped runs at the cursor; returns nothing, advances `y`. */
  write(
    runs: Run[],
    options: { size: number; color?: Rgb; indent?: number; lineHeight?: number; bold?: boolean; after?: number },
  ) {
    const { size, color = COLOR.text, indent = 0, bold = false, after = 0 } = options
    const lineHeight = options.lineHeight ?? size * 1.45
    const x0 = this.left + indent
    const lines = this.layout(runs, size, this.width - indent, bold)
    const spaceWidth = this.measure(" ", false, size)

    for (const line of lines) {
      this.ensure(lineHeight)
      let x = x0
      this.doc.setTextColor(...color)
      for (const word of line) {
        if (word.space && x > x0) x += spaceWidth
        this.doc.setFont(FONT, word.bold ? "bold" : "normal")
        this.doc.setFontSize(size)
        this.doc.text(word.text, x, this.y + size)
        x += this.doc.getTextWidth(word.text)
      }
      this.y += lineHeight
    }
    this.y += after
  }

  /** A short marker (bullet, "1.") hanging to the left of an indented item. */
  marker(text: string, indent: number, size: number, color: Rgb) {
    this.ensure(size * 1.45)
    this.doc.setFont(FONT, "bold")
    this.doc.setFontSize(size)
    this.doc.setTextColor(...color)
    this.doc.text(text, this.left + indent, this.y + size)
  }
}

function registerFonts(doc: jsPDF, fonts: PdfFonts) {
  doc.addFileToVFS("DejaVuSans.ttf", fonts.regular)
  doc.addFont("DejaVuSans.ttf", FONT, "normal")
  doc.addFileToVFS("DejaVuSans-Bold.ttf", fonts.bold)
  doc.addFont("DejaVuSans-Bold.ttf", FONT, "bold")
  doc.setFont(FONT, "normal")
}

/** Lays out parsed Markdown blocks. `scale` shrinks everything for dense slides. */
function renderBlocks(flow: Flow, blocks: Block[], scale = 1) {
  const body = 10.5 * scale
  const { doc } = flow

  for (const block of blocks) {
    switch (block.kind) {
      case "heading": {
        const size = (block.level === 1 ? 17 : block.level === 2 ? 14 : 12) * scale
        flow.y += (block.level === 1 ? 10 : 8) * scale
        // Keep a heading with at least the first lines of what follows.
        flow.ensure(size * 1.3 + body * 3)
        flow.write(block.runs, { size, color: COLOR.green, bold: true, lineHeight: size * 1.3, after: 4 * scale })
        break
      }
      case "paragraph":
        flow.write(block.runs, { size: body, after: 6 * scale })
        break
      case "bullet":
      case "numbered": {
        const indent = (14 + block.depth * 14) * scale
        const marker = block.kind === "bullet" ? "•" : block.marker
        const markerWidth = block.kind === "bullet" ? 10 * scale : 20 * scale
        flow.marker(marker, indent - 2 * scale, body, COLOR.green)
        flow.write(block.runs, { size: body, indent: indent + markerWidth, after: 3 * scale })
        break
      }
      case "quote": {
        const startPage = doc.getNumberOfPages()
        const startY = flow.y
        flow.write(block.runs, { size: body, color: COLOR.muted, indent: 14 * scale, after: 0 })
        // The accent bar is only drawn when the quote did not cross a page.
        if (doc.getNumberOfPages() === startPage) {
          doc.setFillColor(...COLOR.green)
          doc.rect(flow.left + 2, startY + 2, 2.5, flow.y - startY - 2, "F")
        }
        flow.y += 8 * scale
        break
      }
      case "rule":
        flow.ensure(14)
        doc.setDrawColor(...COLOR.rule)
        doc.setLineWidth(0.6)
        doc.line(flow.left, flow.y + 5, flow.right, flow.y + 5)
        flow.y += 14 * scale
        break
      case "table": {
        flow.ensure(60)
        autoTable(doc, {
          head: [block.header],
          body: block.rows,
          startY: flow.y + 2,
          margin: { left: flow.left, right: doc.internal.pageSize.getWidth() - flow.right, top: flow.top, bottom: doc.internal.pageSize.getHeight() - flow.bottom },
          theme: "grid",
          styles: { font: FONT, fontStyle: "normal", fontSize: 9 * scale, cellPadding: 5 * scale, textColor: COLOR.text, lineColor: COLOR.rule, lineWidth: 0.5, overflow: "linebreak" },
          headStyles: { font: FONT, fontStyle: "bold", fillColor: COLOR.greenLight, textColor: COLOR.greenDark },
        })
        const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        flow.y = (finalY ?? flow.y) + 10 * scale
        break
      }
    }
  }
}

/** A4 report: cover block, one section per document, page footers. */
export function buildReportPdf(input: ReportExport, fonts: PdfFonts): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true })
  registerFonts(doc, fonts)
  doc.setProperties({ title: `${input.startupName} — ${input.title}`, creator: "Anza" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 56
  const flow = new Flow(doc, margin, pageWidth - margin, margin, pageHeight - margin - 14)

  // Cover band
  doc.setFillColor(...COLOR.greenDark)
  doc.rect(0, 0, pageWidth, 190, "F")
  const cover = new Flow(doc, margin, pageWidth - margin, 62, 190)
  cover.write([{ text: input.startupName }], { size: 26, color: COLOR.white, bold: true, lineHeight: 32, after: 6 })
  cover.write([{ text: input.title }], { size: 14, color: [187, 230, 208], lineHeight: 20, after: 8 })
  const meta = [formatExportDate(input.generatedAt) && `Generated ${formatExportDate(input.generatedAt)}`, `${input.sections.length} section${input.sections.length === 1 ? "" : "s"}`]
    .filter(Boolean)
    .join("  ·  ")
  cover.write([{ text: meta }], { size: 9.5, color: [187, 230, 208] })
  flow.y = 190 + 28

  input.sections.forEach((section, index) => {
    if (index > 0) flow.newPage()
    flow.write([{ text: section.heading }], { size: 20, color: COLOR.greenDark, bold: true, lineHeight: 26, after: 2 })
    doc.setDrawColor(...COLOR.green)
    doc.setLineWidth(1.5)
    doc.line(flow.left, flow.y + 2, flow.left + 48, flow.y + 2)
    flow.y += 14
    renderBlocks(flow, parseMarkdown(section.markdown))
  })

  // Footers
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont(FONT, "normal")
    doc.setFontSize(8)
    doc.setTextColor(...COLOR.muted)
    doc.text(`${input.startupName} · ${input.title}`.slice(0, 90), margin, pageHeight - 30)
    const label = `Page ${page} of ${pages}`
    doc.text(label, pageWidth - margin - doc.getTextWidth(label), pageHeight - 30)
  }

  return new Blob([doc.output("arraybuffer")], { type: MIME.pdf })
}

/** 16:9 slide-style PDF of the pitch deck — one slide per page. */
export function buildDeckPdf(input: DeckExport, fonts: PdfFonts): Blob {
  const width = 960
  const height = 540
  const doc = new jsPDF({ unit: "pt", format: [width, height], orientation: "landscape", compress: true })
  registerFonts(doc, fonts)
  doc.setProperties({ title: `${input.startupName} — Pitch deck`, creator: "Anza" })

  // Cover
  doc.setFillColor(...COLOR.greenDark)
  doc.rect(0, 0, width, height, "F")
  const cover = new Flow(doc, 72, width - 72, 190, height - 60)
  cover.write([{ text: "INVESTOR PITCH DECK" }], { size: 11, color: [134, 239, 172], bold: true, after: 10 })
  cover.write([{ text: input.startupName }], { size: 46, color: COLOR.white, bold: true, lineHeight: 54, after: 14 })
  const date = formatExportDate(input.generatedAt)
  if (date) cover.write([{ text: date }], { size: 12, color: [187, 230, 208] })

  input.slides.forEach((slide, index) => {
    doc.addPage([width, height], "landscape")
    doc.setFillColor(...COLOR.green)
    doc.rect(0, 0, 10, height, "F")

    const left = 64
    const right = width - 64
    const footerTop = height - 62
    const flow = new Flow(doc, left, right, 44, footerTop - 8)

    flow.write([{ text: (slide.eyebrow || `Slide ${index + 1}`).toUpperCase() }], { size: 10, color: COLOR.green, bold: true, after: 6 })
    flow.write([{ text: slide.title }], { size: 30, color: COLOR.greenDark, bold: true, lineHeight: 36, after: 10 })

    // Shrink dense slides so the body stays on its page whenever possible.
    const blocks = parseMarkdown(slide.body)
    const length = slide.body.length
    const scale = length > 1500 ? 0.9 : length > 1100 ? 1.05 : length > 700 ? 1.2 : 1.4
    renderBlocks(flow, blocks, scale)

    doc.setPage(doc.getNumberOfPages())
    doc.setDrawColor(...COLOR.rule)
    doc.setLineWidth(0.6)
    doc.line(left, footerTop, right, footerTop)
    if (slide.metric) {
      doc.setFont(FONT, "bold")
      doc.setFontSize(20)
      doc.setTextColor(...COLOR.green)
      doc.text(slide.metric.slice(0, 40), left, footerTop + 26)
      if (slide.metricLabel) {
        doc.setFont(FONT, "normal")
        doc.setFontSize(9)
        doc.setTextColor(...COLOR.muted)
        doc.text(slide.metricLabel.slice(0, 80), left, footerTop + 42)
      }
    }
    doc.setFont(FONT, "normal")
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.muted)
    const label = `${input.startupName}  ·  ${index + 1} / ${input.slides.length}`
    doc.text(label, right - doc.getTextWidth(label), footerTop + 26)
  })

  return new Blob([doc.output("arraybuffer")], { type: MIME.pdf })
}
