import PptxGenJS from "pptxgenjs"

import { parseMarkdown, runsToText, type Block, type Run } from "./markdown-blocks"
import { BRAND, MIME, formatExportDate, type DeckExport } from "./types"

const FONT = "Calibri"

type TextProps = PptxGenJS.TextProps

function styledRuns(runs: Run[], base: PptxGenJS.TextPropsOptions, endParagraph: boolean): TextProps[] {
  const source = runs.length ? runs : [{ text: "" }]
  return source.map((run, index) => ({
    text: run.text,
    options: {
      ...base,
      // Paragraph-level settings belong on the first run only.
      ...(index === 0 ? {} : { bullet: undefined, indentLevel: undefined }),
      bold: run.bold || base.bold,
      italic: run.italic,
      breakLine: endParagraph && index === source.length - 1,
    },
  }))
}

/** Slide body as one text box of paragraphs and bullets. Tables become rows of text. */
function bodyText(blocks: Block[], fontSize: number): TextProps[] {
  const out: TextProps[] = []
  const base = { fontFace: FONT, fontSize, color: BRAND.text, paraSpaceAfter: 6 }

  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
        out.push(...styledRuns(block.runs, { ...base, bold: true, color: BRAND.green, fontSize: fontSize + 2 }, true))
        break
      case "paragraph":
        out.push(...styledRuns(block.runs, base, true))
        break
      case "bullet":
        out.push(...styledRuns(block.runs, { ...base, bullet: { indent: 16 }, indentLevel: block.depth }, true))
        break
      case "numbered":
        out.push(...styledRuns([{ text: `${block.marker} `, bold: true }, ...block.runs], { ...base, indentLevel: block.depth }, true))
        break
      case "quote":
        out.push(...styledRuns(block.runs, { ...base, italic: true, color: BRAND.muted }, true))
        break
      case "table":
        out.push(...styledRuns([{ text: block.header.join("  |  "), bold: true }], { ...base, color: BRAND.greenDark }, true))
        for (const row of block.rows) {
          out.push(...styledRuns([{ text: row.join("  |  ") }], { ...base, bullet: { indent: 16 } }, true))
        }
        break
      case "rule":
        break
    }
  }
  return out
}

/** A real, editable .pptx pitch deck (16:9): cover plus one slide per section. */
export async function buildDeckPptx(input: DeckExport): Promise<Blob> {
  const pptx = new PptxGenJS()
  pptx.layout = "LAYOUT_WIDE" // 13.33 x 7.5 in
  pptx.author = "Anza"
  pptx.company = input.startupName
  pptx.title = `${input.startupName} — Pitch deck`

  const cover = pptx.addSlide()
  cover.background = { color: BRAND.greenDark }
  cover.addText("INVESTOR PITCH DECK", { x: 0.9, y: 2.5, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: "86EFAC", charSpacing: 3 })
  cover.addText(input.startupName, { x: 0.9, y: 2.95, w: 11.5, h: 1.4, fontFace: FONT, fontSize: 54, bold: true, color: "FFFFFF", fit: "shrink", valign: "top" })
  const date = formatExportDate(input.generatedAt)
  if (date) cover.addText(date, { x: 0.9, y: 4.45, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 14, color: "BBE6D0" })

  input.slides.forEach((slide, index) => {
    const page = pptx.addSlide()
    page.background = { color: "FFFFFF" }
    page.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: BRAND.green }, line: { color: BRAND.green } })

    page.addText((slide.eyebrow || `Slide ${index + 1}`).toUpperCase(), { x: 0.8, y: 0.45, w: 11.7, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: BRAND.green, charSpacing: 2 })
    page.addText(slide.title, { x: 0.8, y: 0.8, w: 11.7, h: 0.95, fontFace: FONT, fontSize: 34, bold: true, color: BRAND.greenDark, fit: "shrink", valign: "top" })

    const blocks = parseMarkdown(slide.body)
    const length = blocks.reduce((total, block) => total + ("runs" in block ? runsToText(block.runs).length : 80), 0)
    const fontSize = length > 1400 ? 11 : length > 1000 ? 13 : length > 650 ? 15 : 18
    const hasMetric = Boolean(slide.metric)
    page.addText(bodyText(blocks, fontSize), { x: 0.8, y: 1.85, w: 11.7, h: hasMetric ? 4.05 : 4.75, valign: "top", fit: "shrink", margin: 0 })

    page.addShape(pptx.ShapeType.line, { x: 0.8, y: 6.7, w: 11.7, h: 0, line: { color: BRAND.rule, width: 0.75 } })
    if (slide.metric) {
      page.addText(slide.metric, { x: 0.8, y: 5.95, w: 6, h: 0.45, fontFace: FONT, fontSize: 22, bold: true, color: BRAND.green })
      if (slide.metricLabel) page.addText(slide.metricLabel, { x: 0.8, y: 6.35, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: BRAND.muted })
    }
    page.addText(`${input.startupName}  ·  ${index + 1} / ${input.slides.length}`, { x: 6.5, y: 6.8, w: 6, h: 0.35, align: "right", fontFace: FONT, fontSize: 10, color: BRAND.muted })

    // The full, unshrunk text travels with the slide as speaker notes.
    page.addNotes(blocks.map((block) => ("runs" in block ? runsToText(block.runs) : block.kind === "table" ? [block.header, ...block.rows].map((row) => row.join(" | ")).join("\n") : "")).filter(Boolean).join("\n"))
  })

  const data = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer
  return new Blob([data], { type: MIME.pptx })
}
