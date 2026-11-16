import type { Basis, Report, ReportMeta } from "./schema"

export type BasisLabels = Record<Basis, string>

export interface ReportMarkdownLabels {
  basis: BasisLabels
  nextSteps: string
  limitations: string
  sources: string
  retrieved: string
  noSources: string
}

function cell(value: string): string {
  return value.replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "—"
}

/** One markdown string per report section, for the PDF / Word exporters. */
export function reportToExportSections(
  report: Report,
  meta: ReportMeta,
  labels: ReportMarkdownLabels,
): Array<{ heading: string; markdown: string }> {
  const sections = report.sections.map((section) => {
    const parts: string[] = []
    if (section.summary) parts.push(section.summary)
    if (section.findings.length) {
      parts.push(
        section.findings
          .map((f) => `- **[${labels.basis[f.basis]}]** ${f.text}${f.note ? ` _(${f.note})_` : ""}`)
          .join("\n"),
      )
    }
    if (section.table && section.table.rows.length) {
      const header = `| ${section.table.columns.map(cell).join(" | ")} |`
      const rule = `| ${section.table.columns.map(() => "---").join(" | ")} |`
      const rows = section.table.rows.map((row) => `| ${row.map(cell).join(" | ")} |`)
      parts.push([header, rule, ...rows].join("\n"))
    }
    return { heading: section.heading, markdown: parts.join("\n\n") }
  })

  const out = [{ heading: report.title, markdown: report.summary }, ...sections]
  if (report.nextSteps.length) {
    out.push({ heading: labels.nextSteps, markdown: report.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n") })
  }
  if (report.limitations.length) {
    out.push({ heading: labels.limitations, markdown: report.limitations.map((s) => `- ${s}`).join("\n") })
  }
  out.push({
    heading: labels.sources,
    markdown:
      meta.grounded && meta.sources.length
        ? [
            `${labels.retrieved}: ${meta.generatedAt.slice(0, 10)}`,
            ...meta.sources.map((s) => `- ${s.title} — ${s.url}`),
          ].join("\n")
        : labels.noSources,
  })
  return out
}
