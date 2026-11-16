/**
 * Browser entry point for exports. The heavy writers (and the PDF fonts) are
 * loaded only when someone actually exports, so they add nothing to page load.
 * Files are built entirely in the browser — the content never leaves the device.
 */
import { slugifyFilename, type DeckExport, type PdfFonts, type ReportExport } from "./types"

export type ReportFormat = "pdf" | "docx"
export type DeckFormat = "pptx" | "pdf"

let fontsPromise: Promise<PdfFonts> | null = null

async function fetchBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ""
  // Chunked so large files never exceed the argument limit of fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function loadPdfFonts(): Promise<PdfFonts> {
  fontsPromise ??= Promise.all([
    fetchBase64("/fonts/DejaVuSans.ttf"),
    fetchBase64("/fonts/DejaVuSans-Bold.ttf"),
  ])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((error) => {
      fontsPromise = null // allow a retry after a network failure
      throw error
    })
  return fontsPromise
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Business documents → PDF or Word. `name` is the file's base name, e.g. "swot". */
export async function exportReport(format: ReportFormat, report: ReportExport, name: string) {
  const filename = `${slugifyFilename(report.startupName)}-${slugifyFilename(name)}`
  if (format === "pdf") {
    const [{ buildReportPdf }, fonts] = await Promise.all([import("./pdf"), loadPdfFonts()])
    triggerDownload(buildReportPdf(report, fonts), `${filename}.pdf`)
  } else {
    const { buildReportDocx } = await import("./docx")
    triggerDownload(await buildReportDocx(report), `${filename}.docx`)
  }
}

/** Pitch deck → editable PowerPoint or slide-style PDF. */
export async function exportDeck(format: DeckFormat, deck: DeckExport) {
  const filename = `${slugifyFilename(deck.startupName)}-pitch-deck`
  if (format === "pptx") {
    const { buildDeckPptx } = await import("./pptx")
    triggerDownload(await buildDeckPptx(deck), `${filename}.pptx`)
  } else {
    const [{ buildDeckPdf }, fonts] = await Promise.all([import("./pdf"), loadPdfFonts()])
    triggerDownload(buildDeckPdf(deck, fonts), `${filename}.pdf`)
  }
}
