import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"

import { parseMarkdown, type Block, type Run } from "./markdown-blocks"
import { BRAND, formatExportDate, type ReportExport } from "./types"

const FONT = "Calibri"
// Sizes are in half-points.
const BODY = 22

function textRuns(runs: Run[], overrides: { color?: string; bold?: boolean; italics?: boolean; size?: number } = {}) {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        font: FONT,
        size: overrides.size ?? BODY,
        bold: overrides.bold ?? run.bold,
        italics: overrides.italics ?? run.italic,
        color: overrides.color ?? BRAND.text,
      }),
  )
}

function tableCell(text: string, header: boolean) {
  return new TableCell({
    shading: header ? { type: ShadingType.CLEAR, fill: BRAND.greenLight, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: FONT, size: 20, bold: header, color: header ? BRAND.greenDark : BRAND.text })],
      }),
    ],
  })
}

function blockToElements(block: Block): Array<Paragraph | Table> {
  switch (block.kind) {
    case "heading": {
      const size = block.level === 1 ? 32 : block.level === 2 ? 28 : 24
      return [
        new Paragraph({
          heading: block.level === 1 ? HeadingLevel.HEADING_2 : block.level === 2 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
          keepNext: true,
          spacing: { before: 280, after: 120 },
          children: textRuns(block.runs, { color: BRAND.green, bold: true, size }),
        }),
      ]
    }
    case "paragraph":
      return [new Paragraph({ spacing: { after: 160, line: 320 }, children: textRuns(block.runs) })]
    case "bullet":
      return [
        new Paragraph({
          bullet: { level: block.depth },
          spacing: { after: 80, line: 300 },
          children: textRuns(block.runs),
        }),
      ]
    case "numbered": {
      const left = 420 + block.depth * 360
      return [
        new Paragraph({
          indent: { left, hanging: 420 },
          spacing: { after: 80, line: 300 },
          children: [
            new TextRun({ text: `${block.marker}\t`, font: FONT, size: BODY, bold: true, color: BRAND.green }),
            ...textRuns(block.runs),
          ],
          tabStops: [{ type: "left", position: left }],
        }),
      ]
    }
    case "quote":
      return [
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 120, after: 200, line: 320 },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: BRAND.green, space: 12 } },
          children: textRuns(block.runs, { color: BRAND.muted, italics: true }),
        }),
      ]
    case "rule":
      return [
        new Paragraph({
          spacing: { before: 120, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND.rule, space: 1 } },
          children: [],
        }),
      ]
    case "table": {
      const border = { style: BorderStyle.SINGLE, size: 4, color: BRAND.rule }
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
          rows: [
            new TableRow({ tableHeader: true, children: block.header.map((cell) => tableCell(cell, true)) }),
            ...block.rows.map((row) => new TableRow({ children: row.map((cell) => tableCell(cell, false)) })),
          ],
        }),
        new Paragraph({ spacing: { after: 200 }, children: [] }),
      ]
    }
  }
}

/** A real .docx (Office Open XML) report: cover, one section per document, page numbers. */
export async function buildReportDocx(input: ReportExport): Promise<Blob> {
  const date = formatExportDate(input.generatedAt)
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: input.startupName, font: FONT, size: 56, bold: true, color: BRAND.greenDark })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: input.title, font: FONT, size: 32, color: BRAND.green })],
    }),
    new Paragraph({
      spacing: { after: 360 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND.green, space: 8 } },
      children: [
        new TextRun({
          text: [date && `Generated ${date}`, `${input.sections.length} section${input.sections.length === 1 ? "" : "s"}`, "Prepared with Anza"]
            .filter(Boolean)
            .join("  ·  "),
          font: FONT,
          size: 18,
          color: BRAND.muted,
        }),
      ],
    }),
  ]

  input.sections.forEach((section, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index > 0,
        spacing: { after: 240 },
        children: [new TextRun({ text: section.heading, font: FONT, size: 40, bold: true, color: BRAND.greenDark })],
      }),
    )
    for (const block of parseMarkdown(section.markdown)) children.push(...blockToElements(block))
  })

  const doc = new Document({
    creator: "Anza",
    title: `${input.startupName} — ${input.title}`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${input.startupName} · ${input.title} · Page `, font: FONT, size: 16, color: BRAND.muted }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: BRAND.muted }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}
