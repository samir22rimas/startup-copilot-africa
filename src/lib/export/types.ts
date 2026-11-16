/** What the export writers need, independent of any file format. */

export interface ReportExport {
  startupName: string
  /** e.g. "Complete Business Plan" or "SWOT". */
  title: string
  generatedAt: string
  sections: Array<{ heading: string; markdown: string }>
}

export interface DeckExport {
  startupName: string
  generatedAt: string
  slides: Array<{
    eyebrow?: string
    title: string
    body: string
    metric?: string
    metricLabel?: string
  }>
}

/** Base64-encoded TrueType fonts for PDF output (full Unicode, incl. ₦ ₵ →). */
export interface PdfFonts {
  regular: string
  bold: string
}

export const BRAND = {
  green: "0B5D45",
  greenDark: "0B3327",
  greenLight: "E8F5EE",
  text: "1F2937",
  muted: "6B7280",
  rule: "D1D5DB",
} as const

export const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const

export function formatExportDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "startup"
  )
}
