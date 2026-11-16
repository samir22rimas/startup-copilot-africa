/**
 * The one structured-report format used by validation analyses, market
 * research and marketing strategy. A single format means one validator, one
 * renderer and one exporter — and every finding carries a `basis` label so
 * founders can tell verified information from estimates and assumptions.
 */
import { z } from "zod"

export const BASIS = ["verified", "estimate", "assumption"] as const
export type Basis = (typeof BASIS)[number]

const text = (max: number) => z.string().trim().min(1).max(max)

/** Models sometimes return a basis in another case or a near-synonym. */
const basisSchema = z.preprocess((value) => {
  if (typeof value !== "string") return "assumption"
  const v = value.trim().toLowerCase()
  if (v.startsWith("verif") || v === "fact") return "verified"
  if (v.startsWith("estim")) return "estimate"
  return "assumption"
}, z.enum(BASIS))

const findingSchema = z.object({
  text: text(700),
  basis: basisSchema,
  /** For estimates: the assumptions behind the number. Optional otherwise. */
  note: z.string().trim().max(400).optional().nullable(),
})

const tableSchema = z
  .object({
    columns: z.array(text(60)).min(2).max(7),
    rows: z.array(z.array(z.coerce.string().trim().max(300)).min(1).max(7)).max(20),
  })
  .transform((table) => ({
    columns: table.columns,
    // Pad or trim each row so it always lines up with the header.
    rows: table.rows.map((row) =>
      table.columns.map((_, index) => row[index] ?? ""),
    ),
  }))

const sectionSchema = z.object({
  heading: text(120),
  summary: z.string().trim().max(1500).optional().nullable(),
  findings: z.array(findingSchema).max(12).default([]),
  table: tableSchema.optional().nullable(),
})

export const reportSchema = z.object({
  title: text(160),
  summary: text(1500),
  sections: z.array(sectionSchema).min(1).max(10),
  /** Concrete things the founder can do next. */
  nextSteps: z.array(text(400)).max(8).default([]),
  /** What this report could not establish, and why. */
  limitations: z.array(text(400)).max(8).default([]),
})

export type Report = z.infer<typeof reportSchema>
export type ReportSection = Report["sections"][number]
export type ReportFinding = ReportSection["findings"][number]

/** Described to the model; kept next to the schema so the two cannot drift. */
export const REPORT_SHAPE = `{
  "title": "short title",
  "summary": "2-4 sentence overview",
  "sections": [
    {
      "heading": "section heading",
      "summary": "optional short paragraph",
      "findings": [
        { "text": "one specific point", "basis": "verified" | "estimate" | "assumption", "note": "for estimates: the assumptions behind it (optional)" }
      ],
      "table": { "columns": ["A", "B"], "rows": [["a1", "b1"]] }
    }
  ],
  "nextSteps": ["concrete action the founder can take"],
  "limitations": ["what could not be established and how to find out"]
}
"table" is optional — include it only where a comparison genuinely helps. Use 3 to 7 sections.`

export interface ReportSource {
  title: string
  url: string
}

/** How a report was produced — stored in the artifact's `meta`. */
export interface ReportMeta {
  /** True when live web sources were retrieved and are listed in `sources`. */
  grounded: boolean
  sources: ReportSource[]
  /** ISO date the sources were retrieved / the report was generated. */
  generatedAt: string
  model: string
  locale: string
  /** The founder's own question or focus, if they gave one. */
  focus?: string
}

export function readReportMeta(meta: unknown): ReportMeta {
  const m = (meta && typeof meta === "object" ? meta : {}) as Partial<ReportMeta>
  const sources = Array.isArray(m.sources)
    ? m.sources.filter(
        (s): s is ReportSource =>
          Boolean(s) && typeof s.title === "string" && typeof s.url === "string" && /^https?:\/\//i.test(s.url),
      )
    : []
  return {
    grounded: m.grounded === true && sources.length > 0,
    sources,
    generatedAt: typeof m.generatedAt === "string" ? m.generatedAt : "",
    model: typeof m.model === "string" ? m.model : "",
    locale: typeof m.locale === "string" ? m.locale : "en",
    focus: typeof m.focus === "string" ? m.focus : undefined,
  }
}

export function parseReport(content: unknown): Report | null {
  const parsed = reportSchema.safeParse(content)
  return parsed.success ? parsed.data : null
}

export function countByBasis(report: Report): Record<Basis, number> {
  const counts: Record<Basis, number> = { verified: 0, estimate: 0, assumption: 0 }
  for (const section of report.sections) {
    for (const finding of section.findings) counts[finding.basis] += 1
  }
  return counts
}
