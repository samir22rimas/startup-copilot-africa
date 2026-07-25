/** Shared HTML export helpers for Results, Pitch deck, etc. */

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function slugifyFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "startup"
}

export function markdownishToHtml(content: string) {
  return content
    .split("\n")
    .map((line) => {
      const escaped = escapeHtml(line.replace(/\*\*/g, ""))
      if (line.startsWith("### ")) return `<h3>${escaped.slice(4)}</h3>`
      if (line.startsWith("## ")) return `<h2>${escaped.slice(3)}</h2>`
      if (line.startsWith("# ")) return `<h1>${escaped.slice(2)}</h1>`
      if (line.startsWith("- ")) return `<p class="bullet">${escaped.slice(2)}</p>`
      if (/^\d+\.\s/.test(line)) return `<p class="numbered">${escaped}</p>`
      return line ? `<p>${escaped}</p>` : ""
    })
    .join("")
}

const PRINT_STYLES = `
@page { size: A4; margin: 2cm; }
body { font-family: Calibri, Arial, sans-serif; color: #1f2937; font-size: 11pt; line-height: 1.55; max-width: 800px; margin: 0 auto; padding: 24px; }
h1 { color: #0b5d45; font-size: 22pt; margin: 0 0 14pt; page-break-after: avoid; }
h2 { color: #0b5d45; font-size: 15pt; margin: 18pt 0 7pt; page-break-after: avoid; }
h3 { color: #166534; font-size: 13pt; margin: 14pt 0 6pt; }
p { margin: 0 0 9pt; }
.bullet, .numbered { margin-left: 14pt; }
.bullet:before { content: "• "; }
.cover { margin-bottom: 24pt; padding-bottom: 16pt; border-bottom: 2px solid #0b5d45; }
.meta { color: #6b7280; font-size: 10pt; }
.page-break { page-break-before: always; }
.slide { min-height: 80vh; display: flex; flex-direction: column; justify-content: center; padding: 24pt 0; }
.slide-metric { font-size: 28pt; font-weight: bold; color: #0b5d45; margin-top: 24pt; }
@media print { body { padding: 0; } }
`

export function buildResultsExportHtml(input: {
  startupName: string
  title: string
  generatedAt: string
  sections: Array<{ heading: string; content: string }>
}) {
  const body = input.sections
    .map(
      (section, index) =>
        `<section class="${index ? "page-break" : ""}"><h1>${escapeHtml(section.heading)}</h1>${markdownishToHtml(section.content)}</section>`,
    )
    .join("")

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(input.title)}</title><style>${PRINT_STYLES}</style></head><body>
<section class="cover"><h1>${escapeHtml(input.startupName)}</h1><h2>${escapeHtml(input.title)}</h2><p class="meta">Generated ${escapeHtml(new Date(input.generatedAt).toLocaleDateString())} · ${input.sections.length} section${input.sections.length === 1 ? "" : "s"}</p><p>Startup Copilot Africa — for review, discussion, and iteration.</p></section>
${body}
</body></html>`
}

export function buildPitchDeckExportHtml(input: {
  startupName: string
  generatedAt: string
  slides: Array<{ title: string; body: string; eyebrow?: string; metric?: string; metricLabel?: string }>
}) {
  const slides = input.slides
    .map(
      (slide, index) => `<section class="slide ${index ? "page-break" : ""}">
<p class="meta">${escapeHtml(slide.eyebrow || `Slide ${index + 1}`)}</p>
<h1>${escapeHtml(slide.title)}</h1>
${markdownishToHtml(slide.body)}
${slide.metric ? `<p class="slide-metric">${escapeHtml(slide.metric)}</p><p class="meta">${escapeHtml(slide.metricLabel || "")}</p>` : ""}
</section>`,
    )
    .join("")

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(input.startupName)} Pitch Deck</title><style>${PRINT_STYLES}</style></head><body>
<section class="cover"><h1>${escapeHtml(input.startupName)}</h1><h2>Investor pitch deck</h2><p class="meta">Generated ${escapeHtml(new Date(input.generatedAt).toLocaleDateString())} · ${input.slides.length} slides</p></section>
${slides}
</body></html>`
}

export function downloadWordHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "application/msword" })
  triggerDownload(blob, `${filename}.doc`)
}

/** Opens print dialog — user chooses "Save as PDF" in the browser */
export function downloadPdfViaPrint(html: string, filename: string) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700")
  if (!win) {
    alert("Allow pop-ups to export PDF, then try again.")
    return
  }
  win.document.write(html)
  win.document.close()
  win.document.title = filename
  win.focus()
  setTimeout(() => {
    win.print()
  }, 400)
}

function triggerDownload(blob: Blob, filename: string) {
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
